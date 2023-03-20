import browser from 'webextension-polyfill'
import tdsStorage from './storage/tds'
const tldts = require('tldts')

const tabManager = require('./tab-manager')
const trackers = require('./trackers')
const { removeBroken } = require('./utils')

// Note: It is not necessary to use session storage to store the tabId -> port
//       mapping for MV3 compatibility. That is because when the background
//       ServiceWoker becomes inactive, any open connections will be closed and
//       the devtools pages will reopen their connections. At that point, the
//       background ServiceWorker will become active again and the onConnect
//       event will fire again.
const ports = new Map()

export function init () {
    browser.runtime.onConnect.addListener(connected)
}

/**
 * Serialize a subset of the tab object to be sent to the panel
 * @param {Object} tab
 */
export function serializeTab (tab) {
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

function connected (port) {
    if (port.name !== 'devtools') {
        return
    }

    let tabId = -1
    port.onMessage.addListener((m) => {
        if (m.action === 'setTab') {
            tabId = m.tabId
            ports.set(tabId, port)
            const tab = tabManager.get({ tabId })
            postMessage(tabId, 'tabChange', serializeTab(tab))
        } else if (m.action === 'I' || m.action === 'B') {
            const { requestData, siteUrl, tracker } = m
            const matchedTracker = trackers.getTrackerData(requestData.url, siteUrl, requestData)
            if (!matchedTracker || !matchedTracker.tracker) {
                return
            }
            if (tracker.matchedRule && matchedTracker.tracker) {
                // find the rule for this url
                const ruleIndex = matchedTracker.tracker.rules.findIndex((r) => r.rule?.toString() === tracker.matchedRule)
                const rule = matchedTracker.tracker.rules[ruleIndex]
                const parsedHost = tldts.parse(siteUrl)
                if (!parsedHost.domain || !parsedHost.hostname) {
                    return
                }
                if (!rule.exceptions) {
                    rule.exceptions = {}
                }
                if (!rule.exceptions.domains) {
                    rule.exceptions.domains = []
                }
                if (m.action === 'B' && matchedTracker.action === 'redirect') {
                    matchedTracker.tracker.rules.splice(ruleIndex, 1)
                } else if (m.action === 'I') {
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
                console.log('add exception for ', matchedTracker, rule)
            } else {
                matchedTracker.tracker.default = m.action === 'I' ? 'ignore' : 'block'
            }
        } else if (m.action === 'toggleProtection') {
            const tab = tabManager.get({ tabId: m.tabId })
            if (tab.site?.isBroken && tab.url) {
                removeBroken(tab.site.domain)
                removeBroken(new URL(tab.url).hostname)
            } else {
                tabManager.setList({
                    list: 'allowlisted',
                    domain: tab.site.domain,
                    value: !tab.site.allowlisted
                })
            }
            postMessage(tabId, 'tabChange', serializeTab(tab))
        } else if (m.action === 'toggletrackerAllowlist') {
            if (tdsStorage.config.features.trackerAllowlist.state === 'enabled') {
                tdsStorage.config.features.trackerAllowlist.state = 'disabled'
            } else {
                tdsStorage.config.features.trackerAllowlist.state = 'enabled'
            }
        } else if (m.action.startsWith('toggle')) {
            const feature = m.action.slice(6)
            const tab = tabManager.get({ tabId: m.tabId })
            const enabled = tab.site?.enabledFeatures.includes(feature)
            const excludedSites = tdsStorage.config.features[feature].exceptions
            const tabDomain = tldts.getDomain(tab.site.domain)
            if (enabled) {
                excludedSites.push({
                    domain: tabDomain,
                    reason: 'Manually disabled'
                })
            } else {
                excludedSites.splice(excludedSites.findIndex(({ domain }) => domain === tabDomain), 1)
            }
        }
    })
    port.onDisconnect.addListener(() => {
        if (tabId !== -1) {
            ports.delete(tabId)
        }
    })
}

export function postMessage (tabId, action, message) {
    if (ports.has(tabId)) {
        ports.get(tabId).postMessage(JSON.stringify({ tabId, action, message }))
    }
}

export function isActive (tabId) {
    return ports.has(tabId)
}
