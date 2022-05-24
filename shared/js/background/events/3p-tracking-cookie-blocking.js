const tabManager = require('../tab-manager.es6')
const trackerutils = require('../tracker-utils')
const utils = require('../utils.es6')
const devtools = require('../devtools.es6')

function shouldBlockHeaders (request, tab, requestIsTracker) {
    if (requestIsTracker && !tab.site.isFeatureEnabled('trackingCookies3p')) {
        return false
    }
    if (!requestIsTracker && !tab.site.isFeatureEnabled('nonTracking3pCookies')) {
        return false
    }

    if (trackerutils.isFirstPartyByEntity(request.url, tab.url)) {
        return false
    }

    return true
}

/**
 * @param {{tabId: number, url: string, initiator: url, type: string, responseHeaders: Array<{name: string, value:string}>}} request
 *
 * @returns {responseHeaders: Array<{name: string, value:string}>?}
 */
function dropTracking3pCookiesFromResponse (request) {
    const tab = tabManager.get({ tabId: request.tabId })
    let responseHeaders = request.responseHeaders

    if (tab && request.type !== 'main_frame') {
        const requestIsTracker = trackerutils.isTracker(request.url)
        if (!shouldBlockHeaders(request, tab, requestIsTracker)) {
            return { responseHeaders }
        }

        // Strip 3rd party cookie response header
        const cookieFeature = requestIsTracker ? 'trackingCookies3p' : 'nonTracking3pCookies'
        if (!utils.isCookieExcluded(request.url, cookieFeature)) {
            responseHeaders = responseHeaders.filter(header => header.name.toLowerCase() !== 'set-cookie')
            devtools.postMessage(request.tabId, 'cookie', {
                action: 'block',
                kind: `set-cookie-${cookieFeature}`,
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
 * @param {{tabId: number, url: string, initiator: url, type: string, requestHeaders: Array<{name: string, value:string}>}} e
 *
 * @returns {requestHeaders: Array<{name: string, value:string}>?}
 */
function dropTracking3pCookiesFromRequest (request) {
    const tab = tabManager.get({ tabId: request.tabId })
    let requestHeaders = request.requestHeaders

    if (tab && request.type !== 'main_frame') {
        const requestIsTracker = trackerutils.isTracker(request.url)
        if (!shouldBlockHeaders(request, tab, requestIsTracker)) {
            return { requestHeaders }
        }

        // Strip 3rd party response header
        const cookieFeature = requestIsTracker ? 'trackingCookies3p' : 'nonTracking3pCookies'
        if (!utils.isCookieExcluded(request.url, cookieFeature)) {
            requestHeaders = requestHeaders.filter(header => header.name.toLowerCase() !== 'cookie')
            devtools.postMessage(request.tabId, 'cookie', {
                action: 'block',
                kind: `cookie-${cookieFeature}`,
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
