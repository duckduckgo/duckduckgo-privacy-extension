const tabManager = require('../tab-manager.es6')
const trackerutils = require('../tracker-utils')
const utils = require('../utils.es6')
const devtools = require('../devtools.es6')

function shouldBlockHeaders (request, tab, requestIsTracker) {
    if (!tab.site.isFeatureEnabled('cookie')) {
        return false
    }
    if (tab.site.specialDomainName) {
        return false // main frame is a special page (e.g. extension page)
    }

    const cookieSettings = utils.getFeatureSettings('cookie')
    if (requestIsTracker && cookieSettings.trackerCookie !== 'enabled') {
        return false
    }
    if (!requestIsTracker && cookieSettings.nonTrackerCookie !== 'enabled') {
        return false
    }

    if (trackerutils.isFirstPartyByEntity(request.url, tab.url)) {
        return false
    }

    return true
}

/**
 * @param {{tabId: number, requestId: number, url: string, initiator: URL, type: string, responseHeaders: Array<{name: string, value:string}>}} request
 *
 * @returns {{responseHeaders: Array<{name: string, value:string}>} | undefined}
 */
function dropTracking3pCookiesFromResponse (request) {
    // Skip requests not associated with tabs (e.g. requests initiated by
    // ServiceWorkers) for now.
    if (request.tabId === -1) { return }

    const tab = tabManager.get({ tabId: request.tabId })
    let responseHeaders = request.responseHeaders

    if (tab && request.type !== 'main_frame') {
        const requestIsTracker = trackerutils.isTracker(request.url)
        if (!shouldBlockHeaders(request, tab, requestIsTracker)) {
            return { responseHeaders }
        }

        // Strip 3rd party cookie response header
        if (!utils.isCookieExcluded(request.url)) {
            responseHeaders = responseHeaders.filter(header => header.name.toLowerCase() !== 'set-cookie')
            devtools.postMessage(request.tabId, 'cookie', {
                action: 'block',
                kind: `set-cookie-${requestIsTracker ? 'tracker' : 'non-tracker'}`,
                url: request.url,
                siteUrl: tab?.site?.url,
                requestId: request.requestId,
                type: request.type
            })
        }
    }

    return { responseHeaders }
}

/**
 * @param {{tabId: number, requestId: number, url: string, initiator: URL, type: string, requestHeaders: Array<{name: string, value:string}>}} request
 *
 * @returns {{requestHeaders: Array<{name: string, value:string}>} | undefined}
 */
function dropTracking3pCookiesFromRequest (request) {
    // Skip requests not associated with tabs (e.g. requests initiated by
    // ServiceWorkers) for now.
    if (request.tabId === -1) { return }

    const tab = tabManager.get({ tabId: request.tabId })
    let requestHeaders = request.requestHeaders

    if (tab && request.type !== 'main_frame') {
        const requestIsTracker = trackerutils.isTracker(request.url)
        if (!shouldBlockHeaders(request, tab, requestIsTracker)) {
            return { requestHeaders }
        }

        // Strip 3rd party response header
        if (!utils.isCookieExcluded(request.url)) {
            requestHeaders = requestHeaders.filter(header => header.name.toLowerCase() !== 'cookie')
            devtools.postMessage(request.tabId, 'cookie', {
                action: 'block',
                kind: `cookie-${requestIsTracker ? 'tracker' : 'non-tracker'}`,
                url: request.url,
                siteUrl: tab?.site?.url,
                requestId: request.requestId,
                type: request.type
            })
        }
    }

    return { requestHeaders }
}

module.exports = {
    dropTracking3pCookiesFromResponse,
    dropTracking3pCookiesFromRequest
}
