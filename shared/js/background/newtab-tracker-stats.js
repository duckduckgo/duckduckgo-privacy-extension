import browser from 'webextension-polyfill'
import constants from '../../data/constants'
import * as browserWrapper from './wrapper.es6.js'
import { emitter, TrackerBlockedEvent } from './before-request.es6.js'
import tdsStorage from './storage/tds.es6'
const { incoming, outgoing } = constants.trackerStats.events

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
    static unknownCompanyKey = 'unknown'
    /**
     * The prefix used for events. This is used to ensure we only handle events we care about
     */
    static eventPrefix = 'newTabPage_'

    /**
     * @type {Map<string, number> | null}
     */
    top100Companies = null

    /**
     * Internal flag to enable some certain types of logging when developing
     */
    _debug = false

    /**
     * @param {import("./classes/tracker-stats").TrackerStats} stats
     */
    constructor (stats) {
        this.stats = stats
    }

    /**
     * Register *all* communications with the extension here.
     *
     * The purpose of this method is to co-locate all extension handlers in a single
     * place for this module.
     */
    register () {
        /**
         * This listener will redirect the request for tracker-stats.html
         * on the new tab page to our own HTML file under `web_accessible_resources`
         */
        browser.webRequest.onBeforeRequest.addListener(redirectIframeForTrackerStatsMV2,
            {
                // todo(Shane): limit this to only the urls we care about
                urls: ['<all_urls>']
            },
            ['blocking']
        )

        /**
         * Handle runtime messages sent from the new tab page
         */
        browser.runtime.onMessage.addListener((event, sender) => {
            if (sender.id !== browserWrapper.getExtensionId()) return
            this.handleIncomingEvent(event)
        })

        /**
         * Register an alarm and handle when it fires.
         * For now we're pruning data every 5 min
         */
        const pruneAlarmName = 'pruneNewTabData'
        browserWrapper.createAlarm(pruneAlarmName, { periodInMinutes: 5 })
        browser.alarms.onAlarm.addListener(async alarmEvent => {
            if (alarmEvent.name === pruneAlarmName) {
                this.handlePruneAlarm()
            }
        })

        /**
         * listen for the 'tracker-blocked' event that is fired from `before-request.es6.js`
         * when a request is either blocked or a surrogate was used
         */
        emitter.on(TrackerBlockedEvent.eventName, (event) => {
            if (!(event instanceof TrackerBlockedEvent)) return
            this.record(event.companyDisplayName)
        })

        /**
         * Assign the entities from the `tds` data
         */
        this.assignTopCompanies(tdsStorage.tds.entities)
    }

    /**
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
             * Otherwise just increase the 'unknown' count
             */
            this.stats.increment(NewTabTrackerStats.unknownCompanyKey, timestamp)
        }

        // enqueue a sync + data push
        this.debounced('record', 1000, () => {
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
        browserWrapper.syncToStorage(toSync)
    }

    /**
     * Attempt to re-populate stats from storage.
     * @returns {Promise<void>}
     */
    async restoreFromStorage () {
        try {
            const prev = await browserWrapper.getFromStorage(NewTabTrackerStats.storageKey)
            if (prev) {
                this.stats.deserialize(prev.stats)
            }
        } catch (e) {
            console.warn("could not deserialize data from _cachedDisplayData 'trackerStats' storage")
        }

        // also evictExpired once we've restored
        this.stats.evictExpired()
    }

    /**
     * A single handler for all incoming events relating
     * to the new tab page such as heartbeat, sendInitial etc
     * @returns {void}
     */
    handleIncomingEvent (event) {
        /**
         * Handle every message prefixed with `newTabPage_`
         * For now every event just causes new data to be pushed
         */
        if (typeof event.messageType === 'string' && event.messageType.startsWith(NewTabTrackerStats.eventPrefix)) {
            if (event.messageType in incoming) {
                this.sendToNewTab(`response to '${event.messageType}'`)
            } else {
                console.error('unhandled event prefixed with: ', NewTabTrackerStats.eventPrefix, event)
            }
        }
    }

    /**
     * Convert locally stored data into data that can be consumed by a UI
     * @param {string} reason - a reason or path that caused this
     */
    sendToNewTab (reason) {
        if (!reason) throw new Error("you must provide a 'reason' for sending new data")
        this.debounced('sendToNewTab', 200, () => this._publish(reason))
    }

    /**
     * Private method for doing the actual send in a single place
     * that's easy to debug
     */
    _publish (reason = 'unknown') {
        if (this._debug) {
            console.info(`sending new tab data because: ${reason}`)
        }
        /** @type {import("zod").infer<typeof import("../newtab/schema").dataMessage>} */
        const msg = {
            messageType: outgoing.newTabPage_data,
            options: this.toDisplayData()
        }
        chrome.runtime.sendMessage(msg)
    }

    /**
     * When the evictExpired alarm fires:
     *   - cleanup data structure
     *   - store cleaned data
     *   - publish the changed data
     * @param {number} [now] - optional timestamp to use in comparisons
     */
    handlePruneAlarm (now = Date.now()) {
        this.stats.evictExpired()
        this.syncToStorage()
        this.sendToNewTab('following a evictExpired alarm')
    }

    /**
     * Convert the internal data into a format that can be used in the New Tab Page UI
     *
     * First, we group & sort the data, and then we increase the count of "Other" to account
     * for overflows or for trackers where the owner was not in the top 100 list
     *
     * @param {number} maxCount
     * @param {number} [now] - optional timestamp to use in comparisons
     * @returns {import("zod").infer<typeof import("../newtab/schema").dataFormatSchema>}
     */
    toDisplayData (maxCount = 10, now = Date.now()) {
        // access the entries once they are sorted and grouped
        const stats = this.stats.sorted(maxCount, now)

        // is there an entry for 'unknownCompanyKey' (meaning an entry where the company name was skipped)
        const index = stats.results.findIndex(result => result.key === NewTabTrackerStats.unknownCompanyKey)

        // if there is an entry, add the 'overflow' count and move it to the end of the list
        if (index > -1) {
            const element = stats.results[index]
            if (stats.overflow) {
                element.count += stats.overflow
            }
            const spliced = stats.results.splice(index, 1)
            stats.results.push(...spliced)
        } else {
            // if we get here, there was no entry for `unknownCompanyKey`, so we need to add one to cover the overflow
            if (stats.overflow) {
                stats.results.push({
                    key: NewTabTrackerStats.unknownCompanyKey,
                    count: stats.overflow
                })
            }
        }

        // now produce the data in the shape consumers require for rendering their UI
        return {
            totalCount: this.stats.totalCount,
            totalPeriod: 'install-time',
            trackerCompaniesPeriod: 'last-hour',
            trackerCompanies: stats.results.map(item => {
                // convert our known key into the 'Other'
                const displayName = item.key === NewTabTrackerStats.unknownCompanyKey
                    ? 'Other'
                    : item.key

                // create an icon path based on the name
                const iconName = companyDisplayNameToIconName(displayName)

                // use the icon path to formulate an absolute URL to a web_accessible_resource
                let favicon
                if (iconsTheExtensionCanRender.includes(iconName)) {
                    favicon = chrome.runtime.getURL('/img/logos/' + iconName + '.svg')
                } else {
                    favicon = chrome.runtime.getURL('/img/letters/' + iconName[0] + '.svg')
                }

                return {
                    displayName,
                    count: item.count,
                    favicon
                }
            })
        }
    }

    debounceTimers = {}

    /**
     * @param {string} name
     * @param {number} timeout
     * @param {() => unknown} fn
     */
    debounced (name, timeout, fn) {
        clearTimeout(this.debounceTimers[name])
        this.debounceTimers[name] = setTimeout(fn, timeout)
    }
}

/**
 * Respond to requests for `tracker-stats.html` - if we determine
 * that the request was from an allowed origin, re-direct the
 * request to the web_accessible_resource file 'html/tracker-stats.html'
 *
 * @param details
 * @returns {undefined|{redirectUrl: string}}
 */
export function redirectIframeForTrackerStatsMV2 (details) {
    // NOTE: This part is just for internal testing, it will be removed once the PR is approved
    if (details.url === chrome.runtime.getURL('html/redirect.html')) {
        const url = new URL('/chrome_newtab', constants.trackerStats.allowedOrigin)
        url.searchParams.set('ntp_test', '1')
        return {
            redirectUrl: url.toString()
        }
    }
    if (!details.url.endsWith('tracker-stats.html')) {
        return
    }
    if (details.url.startsWith('chrome-extension')) {
        return
    }
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
}

export function companyDisplayNameToIconName (companyName) {
    return (
        (companyName || '')
            .toLowerCase()
            // Remove TLD suffixes
            // e.g. Fixes cases like "amazon.com" -> "amazon"
            .replace(/\.[a-z]+$/i, '')
            // Remove non-alphanumeric characters
            // e.g. Fixes cases like "new relic" -> "newrelic"
            .replace(/[^a-z0-9]/g, '')
    )
}

export const iconsTheExtensionCanRender = [
    'other',
    'adjust',
    'adobe',
    'amazon',
    'amplitude',
    'appnexus',
    'appsflyer',
    'beeswax',
    'branchmetrics',
    'braze',
    'bugsnag',
    'chartbeat',
    'comscore',
    'criteo',
    'facebook',
    'google',
    'googleadsgoogle',
    'googleanalyticsgoogle',
    'indexexchange',
    'instagramfacebook',
    'iponweb',
    'kochava',
    'linkedin',
    'liveramp',
    'magnite',
    'mediamath',
    'microsoft',
    'mixpanel',
    'neustar',
    'newrelic',
    'openx',
    'oracle',
    'outbrain',
    'pinterest',
    'pubmatic',
    'quantcast',
    'rythmone',
    'salesforce',
    'sharetrough',
    'smaato',
    'spotx',
    'taboola',
    'tapad',
    'thenielsencompany',
    'thetradedesk',
    'twitter',
    'urbanairship',
    'verizonmedia',
    'warnermedia',
    'xaxis',
    'yahoojapan',
    'yandex',
    'youtubegoogle',
    'zeotap'
]
