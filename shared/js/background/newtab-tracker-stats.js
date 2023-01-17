import constants from '../../data/constants'
import browser from 'webextension-polyfill'
import * as browserWrapper from './wrapper.es6.js'
import { emitter } from './before-request.es6.js'
const { incoming, outgoing } = constants.trackerStats.events

/**
 * @typedef {object} TrackerStatsDisplay
 * @property {number} totalCount
 * @property {'install-time'} totalPeriod
 * @property {'last-hour'} trackerCompaniesPeriod
 * @property {{displayName: string, count: number, favicon: string}[]} trackerCompanies
 */

/**
 * The extension-specific interface to tracker stats.
 *
 * This class handles all interaction with the extension.
 *
 * Example:
 *
 * ```js
 * const stats = new TrackerStats();
 * const newtab = new NewTabTrackerStats(stats)
 *
 * await newtab.restoreFromStorage();
 * newtab.register()
 *
 * ```
 */
export class NewTabTrackerStats {
    static storageKey = 'trackerStats'

    _debug = false

    /**
     * @param {import("./classes/tracker-stats").TrackerStats} stats
     */
    constructor (stats) {
        this.stats = stats
    }

    /**
     * Register all communications with the extension here
     */
    register () {
        let additionalOptions = []
        if (browserWrapper.getManifestVersion() === 2) {
            additionalOptions = ['blocking']
        }

        /**
         * This listener will redirect the request for tracker-stats.html
         * on the new tab page to our own HTML file under `web_accessible_resources`
         */
        browser.webRequest.onBeforeRequest.addListener(redirectIframeForTrackerStatsMV2,
            {
                // todo(Shane): mv3 implementation
                // todo(Shane): limit this to only the urls we care about
                urls: ['<all_urls>']
            },
            additionalOptions
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
        browserWrapper.createAlarm('pruneNewTabData', { periodInMinutes: 5 })
        browser.alarms.onAlarm.addListener(async alarmEvent => {
            if (alarmEvent.name === 'pruneNewTabData') {
                this.handlePruneAlarm()
            }
        })

        /**
         * listen for the 'tracker-blocked' event that is fired from `before-request.es6.js`
         * when a request is either blocked or a surrogate was used
         */
        emitter.on('tracker-blocked', (event) => {
            const displayName = event.trackerData?.tracker?.owner?.displayName
            if (typeof displayName !== 'string') {
                return console.warn('missing displayName on the tracker-blocked event')
            }
            this.record(displayName)
        })
    }

    /**
     * This will be called for every 'blocked' event. It can be called many times
     * and in quick succession, hence the debouncing
     *
     * @param {string} displayName
     * @param {number} [timestamp] - optional timestamp
     */
    record (displayName, timestamp) {
        this.stats.increment(displayName, timestamp)

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
            this.stats.deserialize(prev.stats)
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
        if (typeof event.messageType === 'string' && event.messageType.startsWith('newTabPage_')) {
            if (event.messageType in incoming) {
                this.sendToNewTab(`response to '${event.messageType}'`)
            } else {
                console.error('unhandled event prefixed with newTabPage_', event)
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
        chrome.runtime.sendMessage({
            messageType: outgoing.newTabPage_data,
            options: this.toDisplayData()
        })
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
     * Sort the stats and append a favicon path that's specific to the extension
     *
     * @param {number} [now] - optional timestamp to use in comparisons
     * @returns {TrackerStatsDisplay}
     */
    toDisplayData (now = Date.now()) {
        // access the entries once they are sorted and grouped
        const stats = this.stats.sorted(now)

        // now produce the data in the shape consumers require for rendering their UI
        return {
            totalCount: this.stats.totalCount,
            totalPeriod: 'install-time',
            trackerCompaniesPeriod: 'last-hour',
            trackerCompanies: stats.map(item => {
                const iconName = companyDisplayNameToIconName(item.key)
                let favicon
                if (iconsTheExtensionCanRender.includes(iconName)) {
                    favicon = chrome.runtime.getURL('/img/logos/' + iconName + '.svg')
                } else {
                    favicon = chrome.runtime.getURL('/img/letters/' + iconName[0] + '.svg')
                }
                return {
                    displayName: item.key,
                    count: item.count,
                    favicon
                }
            })
        }
    }

    debounceTimers = {}

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
    if (details.url === chrome.runtime.getURL('html/redirect.html')) {
        return {
            redirectUrl: 'https://eun-sosbourne1.duckduckgo.com/chrome_newtab?ntp_test'
        }
    }
    if (!details.url.endsWith('tracker-stats.html')) {
        return
    }
    if (details.url.startsWith('chrome-extension')) {
        return
    }
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
