const tabManager = require('../tab-manager.es6')
const trackerutils = require('../tracker-utils')
const utils = require('../utils.es6')
const devtools = require('../devtools.es6')

/**
 * @param {{tabId: number, url: string, initiator: url, type: string, responseHeaders: Array<{name: string, value:string}>}} request
 *
 * @returns {responseHeaders: Array<{name: string, value:string}>?}
 */
function dropTracking3pCookiesFromResponse (request) {
    const tab = tabManager.get({ tabId: request.tabId })
    let responseHeaders = request.responseHeaders

    if (tab && tab.site.isFeatureEnabled('trackingCookies3p') && request.type !== 'main_frame') {
        // if (!trackerutils.isTracker(request.url)) {
        //     return { responseHeaders }
        // }

        // Strip 3rd party response header
        if (!request.responseHeaders) return { responseHeaders }
        if (!tab) {
            const initiator = request.initiator || request.documentUrl
            if (!initiator || trackerutils.isFirstPartyByEntity(initiator, request.url)) {
                return { responseHeaders }
            }
        } else if (tab && trackerutils.isFirstPartyByEntity(request.url, tab.url)) {
            return { responseHeaders }
        }
        if (!utils.isCookieExcluded(request.url)) {
            responseHeaders = responseHeaders.filter(header => header.name.toLowerCase() !== 'set-cookie')
            devtools.postMessage(request.tabId, 'cookie', {
                action: 'block',
                kind: 'set-cookie',
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

    if (tab && tab.site.isFeatureEnabled('trackingCookies3p') && request.type !== 'main_frame') {
        // if (!trackerutils.isTracker(request.url)) {
        //    return { requestHeaders }
        // }

        // Strip 3rd party response header
        if (!requestHeaders) return { requestHeaders }
        if (!tab) {
            const initiator = request.initiator || request.documentUrl
            if (!initiator || trackerutils.isFirstPartyByEntity(initiator, request.url)) {
                return { requestHeaders }
            }
        } else if (tab && trackerutils.isFirstPartyByEntity(request.url, tab.url)) {
            return { requestHeaders }
        }
        if (!utils.isCookieExcluded(request.url)) {
            requestHeaders = requestHeaders.filter(header => header.name.toLowerCase() !== 'cookie')
            devtools.postMessage(request.tabId, 'cookie', {
                action: 'block',
                kind: 'cookie',
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
