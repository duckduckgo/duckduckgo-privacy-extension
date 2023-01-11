import constants from '../../../data/constants'
import { aggregatedTrackerStats } from '../aggregated-tracker-stats'
const { incoming, outgoing } = constants.trackerStats.events

/**
 * Respond to requests for `tracker-stats.html` - if we determine
 * that the request was from an allowed origin, re-direct the
 * request to the web_accessible_resource file 'html/tracker-stats.html'
 *
 * @param details
 * @returns {undefined|{redirectUrl: string}}
 */
export function redirectIframeForTrackerStatsMV2 (details) {
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

/**
 * Handler for when any page-load was completed.
 * For now we just send the latest data as a way to keep it fresh
 */
export function sendTrackerStatsOnComplete () {
    sendNewTabPage()
}

/**
 * These are the handlers for incoming messages from the new tab page script.
 * @type {Record<keyof constants['trackerStats']['events']['incoming'], any>}
 */
const handlers = {
    [incoming.newTabPage_readInitial]: () => {
        sendNewTabPage()
    },
    [incoming.newTabPage_reset]: () => {
        aggregatedTrackerStats.reset()
        sendNewTabPage()
    },
    [incoming.newTabPage_showDetails]: () => {
        aggregatedTrackerStats.show()
        sendNewTabPage()
    },
    [incoming.newTabPage_hideDetails]: () => {
        aggregatedTrackerStats.hide()
        sendNewTabPage()
    }
}

/**
 * A single handler for all incoming events relating
 * to the new tab page
 * @returns {void}
 */
export function handleIncomingNewtabPageEvent (event) {
    if (event.messageType in handlers) {
        handlers[event.messageType](event.options)
    } else {
        console.error('unhandled event', event)
    }
}

/**
 * Transmit the latest data to the new tab page
 * This message is picked up by the iframe and forwarded into the new tab
 * page
 */
function sendNewTabPage () {
    chrome.runtime.sendMessage({
        messageType: outgoing.newTabPage_data,
        options: aggregatedTrackerStats.toDisplayData()
    })
}

/**
 * What should happen when the alarm fires? In our case we're currently just
 * pruning our internal data structure and then re-sending to clients
 */
export function pruneAlarm () {
    aggregatedTrackerStats.prune()
    sendNewTabPage()
}

/**
 * An interface to expose to the rest of the extension.
 *
 * When `record` is called, it will update the internal data structure and
 * then schedule the outgoing data with a slight debounce
 */
export const blockedRequests = {
    /**
     * @type {number | undefined}
     */
    timerId: undefined,
    /**
     * @param {string} displayName
     */
    record (displayName) {
        aggregatedTrackerStats.increment(displayName)
        clearTimeout(this.timerId)
        // debounce outgoing data sends for a second.
        // @ts-ignore
        this.timerId = setTimeout(() => {
            sendNewTabPage()
        }, 1000)
    }
}
