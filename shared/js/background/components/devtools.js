import browser from 'webextension-polyfill'
import tabManager from '../tab-manager'
import tldts from 'tldts'
import trackers from '../trackers'
import { removeBroken } from '../utils'
import { registerDevtools } from '../devtools'

/**
 * @typedef {import('../classes/tab')} Tab
 * @typedef {import('./tds').default} TDSStorage
 * @typedef {import("../../../../node_modules/@duckduckgo/privacy-grade/src/classes/trackers").TrackerData} TrackerData
 */

class DevtoolsConnection {
    static allowedMessageActions = new Set(
        ['setTab', 'toggleFeature', 'toggleProtections', 'toggleTracker']
    )

    /**
     * @param {Devtools} devtools
     * @param {Object} port
     */
    constructor (devtools, port) {
        this.devtools = devtools
        this.disconnected = new Promise(resolve => {
            this._disconnectedResolver = resolve
        })
        this.port = port
        this.tabId = new Promise(resolve => {
            this._tabIdResolver = resolve
        })

        port.onMessage.addListener(async message => {
            const { action, id } = message
            if (DevtoolsConnection.allowedMessageActions.has(action)) {
                const response = await this[action](message)
                if (typeof id === 'number') {
                    this.postMessage('response', { id, response })
                }
            }
        })

        port.onDisconnect.addListener(this._disconnectedResolver)
    }

    /**
     * @param {string} action
     * @param {any} message
     * @returns {Promise<void>}
     */
    async postMessage (action, message) {
        const tabId = await this.tabId
        this.port.postMessage(JSON.stringify({ tabId, action, message }))
    }

    /**
     * Link this DevtoolsConnection to a tab ID. This should be called once,
     * shortly after the connection is first established, when the setTab
     * message is received.
     * @param {{
     *   tabId: number
     * }} message
     */
    setTab ({ tabId }) {
        this._tabIdResolver(tabId)
        const tab = tabManager.get({ tabId })
        this.postMessage('tabChange', this.devtools.serializeTab(tab))
    }

    /**
     * Toggle one feature on/off for the tab.
     * @param {{
     *   feature: string
     * }} message
     * @returns {Promise<void>}
     */
    async toggleFeature ({ feature }) {
        if (feature === 'trackerAllowlist') {
            await this.devtools.tds.config.modify(config => {
                const currentState = config.features.trackerAllowlist.state
                config.features.trackerAllowlist.state =
                    currentState === 'enabled' ? 'disabled' : 'enabled'
                return config
            })
        } else {
            const tabId = await this.tabId
            const tab = tabManager.get({ tabId })
            const enabled = tab.site?.enabledFeatures.includes(feature)
            const tabDomain = tldts.getDomain(tab.site.domain)

            await this.devtools.tds.config.modify(config => {
                const excludedSites = config.features[feature].exceptions
                if (enabled) {
                    excludedSites.push({
                        domain: tabDomain,
                        reason: 'Manually disabled'
                    })
                } else {
                    excludedSites.splice(excludedSites.findIndex(({ domain }) => domain === tabDomain), 1)
                }
                return config
            })
        }
    }

    /**
     * Toggle all protections on/off for the tab.
     * @returns {Promise<void>}
     */
    async toggleProtections () {
        const tabId = await this.tabId
        const tab = tabManager.get({ tabId })
        if (tab.site?.isBroken && tab.url) {
            await this.devtools.tds.config.modify(config => {
                removeBroken(tab.site.domain, config)
                if (tab.url) {
                    removeBroken(new URL(tab.url).hostname, config)
                }
                return config
            })
        } else {
            await tabManager.setList({
                list: 'allowlisted',
                domain: tab.site.domain,
                value: !tab.site.allowlisted
            })
        }
        this.postMessage('tabChange', this.devtools.serializeTab(tab))
    }

    /**
     * Toggle blocking/redirecting of a request on/off for the tab.
     * @param {{
     *   requestData: {
     *     type: string,
     *     url: string,
     *   },
     *   siteUrl: string,
     *   tracker: TrackerData,
     *   toggleType: string
     * }} message
     */
    toggleTracker ({ requestData, siteUrl, tracker, toggleType }) {
        const matchedTrackerDetails = trackers.getTrackerData(
            requestData.url, siteUrl, requestData
        )
        const matchedTrackerDomain = matchedTrackerDetails?.tracker?.domain
        const matchedTrackerAction = matchedTrackerDetails?.action

        if (!matchedTrackerDomain) {
            return
        }

        this.devtools.tds.tds.modify(tds => {
            const matchedTracker = tds.trackers[matchedTrackerDomain]
            if (!matchedTracker) {
                return tds
            }

            if (!tracker.matchedRule) {
                matchedTracker.default =
                    toggleType === 'I' ? 'ignore' : 'block'
                return tds
            }

            // Find the rule for this URL.
            const ruleIndex = matchedTracker.rules.findIndex((r) => r.rule?.toString() === tracker.matchedRule)
            const rule = matchedTracker.rules[ruleIndex]

            const parsedHost = tldts.parse(siteUrl)
            if (!parsedHost.domain || !parsedHost.hostname) {
                return tds
            }

            if (!rule.exceptions) {
                rule.exceptions = {}
            }
            if (!rule.exceptions.domains) {
                rule.exceptions.domains = []
            }

            if (toggleType === 'B' && matchedTrackerAction === 'redirect') {
                matchedTracker.rules.splice(ruleIndex, 1)
            } else if (toggleType === 'I') {
                rule.exceptions.domains.push(parsedHost.domain)
                if (rule.exceptions.types && !rule.exceptions.types.includes(requestData.type)) {
                    rule.exceptions.types.push(requestData.type)
                }
            } else {
                let index = rule.exceptions.domains.indexOf(parsedHost.domain)
                if (index === -1) {
                    index = rule.exceptions.domains.indexOf(parsedHost.hostname)
                }
                rule.exceptions.domains.splice(index, 1)
            }

            return tds
        })
    }
}

export default class Devtools {
    /**
     * @param {{
     *   tds: TDSStorage
     * }} options
     */
    constructor ({ tds }) {
        this.tds = tds
        // Note: It is not necessary to use session storage to store the
        //       tabId -> DevtoolsConnection mapping for MV3 compatibility. That
        //       is because when the background ServiceWoker becomes inactive,
        //       any open connections will be closed and the devtools pages will
        //       reopen their connections. At that point, the background
        //       ServiceWorker will become active again and the onConnect event
        //       will fire again.
        this.devtoolsConnections = new Map()
        this.debugHandlers = new Map()
        browser.runtime.onConnect.addListener(port => { this.onConnect(port) })
        registerDevtools(this)
    }

    /**
     * Called when a new devtools messaging connection is opened. Keeps track of
     * the tabId -> connection mapping, used to route incoming messages to the
     * right DevtoolsConnection (if any).
     * @param {Object} port
     * @returns {Promise<void>}
     */
    async onConnect (port) {
        if (port.name !== 'devtools') {
            return
        }

        const devtoolsConnection = new DevtoolsConnection(this, port)
        const tabId = await devtoolsConnection.tabId
        this.devtoolsConnections.set(tabId, devtoolsConnection)

        await devtoolsConnection.disconnected
        this.devtoolsConnections.delete(tabId)
    }

    /**
     * Checks if Devtools is active for the given tab ID. Active here means that
     * there's a registered DevtoolsConnection (the user has devtools-panel.html
     * open), or there's registered debug handler (the user is using the
     * privacy-protections-debugger) for the tab. Important, since there's no
     * need to track blocking etc debugging events otherwise.
     * @param {number} tabId
     * @returns {boolean}
     */
    isActive (tabId) {
        return this.devtoolsConnections.has(tabId) || this.debugHandlers.has(tabId)
    }

    /**
     * @param {number} tabId
     * @param {string} action
     * @param {any} message
     */
    postMessage (tabId, action, message) {
        if (this.devtoolsConnections.has(tabId)) {
            this.devtoolsConnections.get(tabId).postMessage(action, message)
        }
        if (this.debugHandlers.has(tabId)) {
            this.debugHandlers.get(tabId)({ tabId, action, message })
        }
    }

    /**
     * Register a debug handler function for the given tab ID, used by the
     * privacy-protections-debugger tool.
     * @param {number} tabId
     * @param {function} fn
     */
    registerDebugHandler (tabId, fn) {
        this.debugHandlers.set(tabId, fn)
    }

    /**
     * Serialize a subset of the tab object to be sent to the panel.
     * @param {Tab} tab
     * @returns {{
     *   site?: {
     *     allowlisted: boolean,
     *     isBroken: boolean|undefined,
     *     enabledFeatures: String[]
     *   }
     * }}
     */
    serializeTab (tab) {
        if (tab.site) {
            return {
                site: {
                    allowlisted: tab.site.allowlisted,
                    isBroken: tab.site.isBroken,
                    enabledFeatures: tab.site.enabledFeatures || []
                }
            }
        }
        return {}
    }
}
