import browser from 'webextension-polyfill'
import constants from '../../data/constants'
import { getManifestVersion, createAlarm, syncToStorage, getFromStorage } from './wrapper.js'
import tdsStorage from './storage/tds'
import { emitter, TrackerBlockedEvent } from './before-request.js'
import { generateDNRRule } from '@duckduckgo/ddg2dnr/lib/utils'
import { NEWTAB_TRACKER_STATS_REDIRECT_PRIORITY } from '@duckduckgo/ddg2dnr/lib/rulePriorities'
import { NEWTAB_TRACKER_STATS_REDIRECT_RULE_ID } from './dnr-utils'

/**
 * @typedef {import('./settings.js')} Settings
 * @typedef {import("../background/classes/tracker-stats").TrackerStats} TrackerStats
 */

const {
    incoming,
    outgoing
} = constants.trackerStats.events
const { clientPortName } = constants.trackerStats

/**
 * The extension-specific interface to tracker stats.
 *
 * This class handles all interaction with the extension like event handlers, alarms etc.
 *
 * Example:
 *
 * ```js
 * const stats = new TrackerStats();
 * const newtab = new NewTabTrackerStats(stats)
 *
 * await newtab.restoreFromStorage();
 * newtab.register()
 * ```
 */
export class NewTabTrackerStats {
    /**
     * The key to use when persisting data into storage
     */
    static storageKey = 'trackerStats'
    /**
     * The key to use when we don't want to record the company name
     */
    static otherCompaniesKey = '__others__'
    /**
     * The prefix used for events. This is used to ensure we only handle events we care about
     */
    static eventPrefix = 'newTabPage_'

    /**
     * A place to store a singleton instance of this class
     * @type {NewTabTrackerStats | null}
     */
    static shared = null

    /**
     * @type {Map<string, number> | null}
     */
    top100Companies = null

    /**
     * Internal flag to enable some certain types of logging when developing
     */
    _debug = false

    ports = []

    /**
     * @param {TrackerStats} stats - the interface for the stats data.
     * @param {Settings} extensionSettings
     */
    constructor (stats, extensionSettings) {
        this.stats = stats
        this.settings = extensionSettings
    }

    /**
     * Register *all* communications with the extension here.
     *
     * The purpose of this method is to co-locate all extension handlers in a single
     * place for this module.
     */
    register () {
        const manifestVersion = getManifestVersion()
        if (manifestVersion === 3) {
            mv3Redirect()
        } else {
            mv2Redirect()
        }

        /**
         * Maintain a pool of connections - these will occur for every New Tab Page
         * instance.
         */
        chrome.runtime.onConnect.addListener((port) => {
            if (port.name !== clientPortName) return

            // keep a reference to this port
            this.ports.push(port)

            // handle every message on this port
            port.onMessage.addListener((msg) => {
                this._handleIncomingEvent(msg)
            })

            // ensure we're not holding on to zombie ports (those that have disconnected)
            port.onDisconnect.addListener((msg) => {
                const index = this.ports.indexOf(port)
                if (index > -1) {
                    console.log('removing port with index:', index)
                    this.ports.splice(index, 1)
                }
            })
        })

        /**
         * Register an alarm and handle when it fires.
         * For now, we're pruning data every 10 min
         */
        const pruneAlarmName = 'pruneNewTabData'
        createAlarm(pruneAlarmName, { periodInMinutes: 10 })
        browser.alarms.onAlarm.addListener(async alarmEvent => {
            if (alarmEvent.name === pruneAlarmName) {
                this._handlePruneAlarm()
            }
        })

        /**
         * listen for the 'tracker-blocked' event that is fired from `before-request.js`
         * when a request is either blocked or a surrogate was used
         */
        emitter.on(TrackerBlockedEvent.eventName, (event) => {
            if (!(event instanceof TrackerBlockedEvent)) return
            this.record(event.companyDisplayName)
        })

        /**
         * Assign the entities from the initial `tds` data
         */
        this.assignTopCompanies(tdsStorage.tds.entities)

        /**
         * Observe changes to the 'tds' data and update the topCompanies
         */
        tdsStorage.onUpdate('tds', (name, etag, updatedValue) => {
            // just double-checking, is this incoming data validated anywhere else?
            if (updatedValue?.tds?.entities) {
                this.assignTopCompanies(updatedValue.tds.entities)
            }
        })
    }

    /**
     * Create a Map of 'top companies' based on entity prevalence
     * This is used to ensure we only store the names of companies in the top 100 list
     *
     * @param {Record<string, { displayName: string, prevalence: number }>} entities
     * @param {number} [maxCount] - how many to consider 'top companies'
     */
    assignTopCompanies (entities, maxCount = 100) {
        const sorted = Object.keys(entities)
            .map(
                /** @returns {[string, number]} */
                (key) => {
                    const current = entities[key]
                    return [current.displayName, current.prevalence]
                })
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxCount)

        this.top100Companies = new Map(sorted)
    }

    /**
     * This will be called for every 'blocked' event. It can be called many times
     * and in quick succession, hence the debouncing
     *
     * @param {string} displayName
     * @param {number} [timestamp] - optional timestamp
     */
    record (displayName, timestamp) {
        /**
         * Increment the count of this company if the following 2 predicates are satisfied
         *
         * 1) the `displayName` of the company is in our top100Companies list
         * 2) the `displayName` of the company is NOT in our `excludedCompanies` list
         */
        if (this.top100Companies?.has(displayName) && !constants.trackerStats.excludedCompanies.includes(displayName)) {
            this.stats.increment(displayName, timestamp)
        } else {
            /**
             * Otherwise just increase the 'Other' count
             */
            this.stats.increment(NewTabTrackerStats.otherCompaniesKey, timestamp)
        }

        // enqueue a sync + data push
        this._throttled('record', 1000, () => {
            this.syncToStorage()
            this.sendToNewTab('following a recorded tracker-blocked event')
        })
    }

    /**
     * Persist data into the extensions storage in the following format
     */
    syncToStorage () {
        const serializedData = this.stats.serialize()
        const toSync = {
            [NewTabTrackerStats.storageKey]: {
                // making this an object to ensure we can store more things under this
                // namespace later if we need to
                stats: serializedData
            }
        }
        syncToStorage(toSync)
    }

    /**
     * Attempt to re-populate stats from storage.
     * @returns {Promise<void>}
     */
    async restoreFromStorage () {
        try {
            const prev = await getFromStorage(NewTabTrackerStats.storageKey)
            if (prev) {
                this.stats.deserialize(prev.stats)
            }
        } catch (e) {
            console.warn('could not deserialize data from _cachedDisplayData \'trackerStats\' storage')
        }

        // also evictExpired once we've restored
        this.stats.evictExpired()
    }

    /**
     * Convert locally stored data into data that can be consumed by a UI
     * @param {string} reason - a reason or path that caused this
     */
    sendToNewTab (reason) {
        if (!reason) throw new Error('you must provide a \'reason\' for sending new data')
        this._throttled('sendToNewTab', 200, () => this._publish(reason))
    }

    /**
     * A single handler for all incoming events relating
     * to the new tab page such as heartbeat etc
     * @returns {void}
     */
    _handleIncomingEvent (event) {
        // only handle messages prefixed with `newTabPage_`
        if (typeof event.messageType === 'string' && event.messageType.startsWith(NewTabTrackerStats.eventPrefix)) {
            // currently this is the only incoming message we accept
            if (event.messageType === incoming.newTabPage_heartbeat) {
                this.sendToNewTab(`response to '${event.messageType}'`)
            } else {
                console.error('unhandled event prefixed with: ', NewTabTrackerStats.eventPrefix, event)
            }
        }
    }

    /**
     * Private method for doing the actual send in a single place
     * that's easy to debug
     */
    _publish (reason = 'unknown') {
        if (this._debug) {
            console.info(`sending new tab data because: ${reason}`)
        }

        /** @type {import('zod').infer<typeof import('../newtab/schema').dataMessage>} */
        const msg = {
            messageType: outgoing.newTabPage_data,
            options: this.toDisplayData()
        }

        const invalidPorts = []
        for (const port of this.ports) {
            try {
                port.postMessage(msg)
            } catch (e) {
                invalidPorts.push(port)
            }
        }

        if (invalidPorts.length) {
            console.error('Stale ports detected...', invalidPorts)
        }
    }

    /**
     * When the evictExpired alarm fires:
     *   - cleanup data structure
     *   - store cleaned data
     *   - publish the changed data
     * @param {number} [now] - optional timestamp to use in comparisons
     */
    _handlePruneAlarm (now = Date.now()) {
        this.stats.evictExpired(now)
        this.syncToStorage()
        this.sendToNewTab('following a evictExpired alarm')
    }

    /**
     * Convert the internal data into a format that can be used in the New Tab Page UI
     *
     * First, we group & sort the data, and then we increase the count of "Other" to account
     * for overflows or for trackers where the owner was not in the top 100 list
     *
     * @param {number} [now] - optional timestamp to use in comparisons
     * @returns {import('zod').infer<typeof import('../newtab/schema').dataFormatSchema>}
     */
    toDisplayData (now = Date.now()) {
        // access the entries once they are sorted and grouped
        const stats = this.stats.sorted(now)
        const index = stats.findIndex(result => result.key === NewTabTrackerStats.otherCompaniesKey)

        // ensure 'other' is pushed to the end of the list
        if (index > -1) {
            const spliced = stats.splice(index, 1)
            stats.push(...spliced)
        }

        const atbValue = this.settings.getSetting('atb')

        // now produce the data in the shape consumers require for rendering their UI
        // see 'dataFormatSchema' for the required format, it's in the `../newtab/schema` file
        return {
            atb: atbValue || undefined,
            totalCount: this.stats.totalCount,
            totalPeriod: 'install-time',
            trackerCompaniesPeriod: 'last-day',
            trackerCompanies: stats.map(item => {
                // convert our known key into the 'Other'
                const displayName = item.key === NewTabTrackerStats.otherCompaniesKey
                    ? 'Other'
                    : item.key

                return {
                    displayName,
                    count: item.count
                }
            })
        }
    }

    throttleFlags = {}

    /**
     * A trailing throttle implementation.
     *
     * This will ensure a given operation does not execute more
     * than once within the given timeframe;
     *
     * @param {string} name
     * @param {number} timeout
     * @param {() => unknown} fn
     */
    _throttled (name, timeout, fn) {
        if (this.throttleFlags[name] === true) {
            // do nothing, if we get here we're already _throttled
        } else {
            // mark this operation as active
            this.throttleFlags[name] = true

            // schedule the callback
            setTimeout(() => {
                // mark this operation as 'inactive'
                this.throttleFlags[name] = false
                fn()
            }, timeout)
        }
    }
}

/**
 * Respond to requests for `tracker-stats.html` - if we determine
 * that the request was from an allowed origin, re-direct the
 * request to the web_accessible_resource file 'html/tracker-stats.html'
 *
 * @param details
 */
export function mv2Redirect () {
    const incomingUrl = new URL(constants.trackerStats.allowedPathname, constants.trackerStats.allowedOrigin)
    /**
     * This listener will redirect the request for tracker-stats.html
     * on the new tab page to our own HTML file under `web_accessible_resources`
     */
    browser.webRequest.onBeforeRequest.addListener((details) => {
        // Only do the redirect if we're being iframed into a known origin
        if (details.type === 'sub_frame') {
            const parsed = new URL(details.url)
            if (parsed.origin === constants.trackerStats.allowedOrigin) {
                if (parsed.pathname.includes(constants.trackerStats.allowedPathname)) {
                    return {
                        redirectUrl: chrome.runtime.getURL(constants.trackerStats.redirectTarget)
                    }
                }
            }
        }
        return undefined
    },
    {
        urls: [incomingUrl.toString()],
        types: ['sub_frame']
    },
    ['blocking'])
}

function mv3Redirect () {
    const targetUrl = chrome.runtime.getURL(constants.trackerStats.redirectTarget)
    const incomingUrl = new URL(constants.trackerStats.allowedPathname, constants.trackerStats.allowedOrigin)
    const redirectRule = generateDNRRule({
        id: NEWTAB_TRACKER_STATS_REDIRECT_RULE_ID,
        priority: NEWTAB_TRACKER_STATS_REDIRECT_PRIORITY,
        actionType: 'redirect',
        redirect: {
            url: targetUrl
        },
        urlFilter: incomingUrl.toString(),
        resourceTypes: ['sub_frame']
    })
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [redirectRule.id],
        addRules: [redirectRule]
    })
}
