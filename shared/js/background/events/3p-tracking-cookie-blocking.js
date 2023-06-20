const trackerutils = require('../tracker-utils')
const utils = require('../utils')
const browserWrapper = require('../wrapper')

class ThirdPartyTrackingCookieBlocking {
     manifestVersion = browserWrapper.getManifestVersion()
    /**
     * Set of requestId that we saw where we expect the cookies to be blocked.
     * Used in MV3 to detect a cookie blocking gap caused by the limitations of DNR.
     *
     * Note: this is OK to keep in a variable because we only need to keep this data for the time
     * between to phases of the webRequest lifecycle for a given request (onHeadersReceived and onCompleted).
     * As this will be, in most cases, a fraction of a second, we don't expect loss of state due to
     * Service Worker restart to be an issue.
     */
    expectedSetCookieBlocked = new Set()

    /**
     * @param {import("../tab-manager").TabManager} tabManager
     * @param {import("../devtools").DevTools} devtools
     */
    constructor (tabManager, devtools) {
        this.tabManager = tabManager;
        this.devtools = devtools;
    }

    shouldBlockHeaders (request, tab, requestIsTracker) {
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
    dropTracking3pCookiesFromResponse (request) {
        if (request.type === 'main_frame' || request.responseHeaders.findIndex(header => header.name.toLowerCase() === 'set-cookie') === -1) {
            return
        }
        const tab = this.tabManager.get({ tabId: request.tabId })
        let responseHeaders = request.responseHeaders

        if (tab) {
            const requestIsTracker = trackerutils.isTracker(request.url)
            if (!this.shouldBlockHeaders(request, tab, requestIsTracker)) {
                return
            }

            // Strip 3rd party cookie response header
            if (!utils.isCookieExcluded(request.url)) {
                responseHeaders = responseHeaders.filter(header => header.name.toLowerCase() !== 'set-cookie')
                this.devtools.postMessage(request.tabId, 'cookie', {
                    action: 'block',
                    kind: `set-cookie-${requestIsTracker ? 'tracker' : 'non-tracker'}`,
                    url: request.url,
                    siteUrl: tab?.site?.url,
                    requestId: request.requestId,
                    type: request.type
                })
                if (this.manifestVersion === 2) {
                    return { responseHeaders }
                } else {
                    this.expectedSetCookieBlocked.add(request.requestId)
                }
            }
        }
    }

    /**
     * @param {{tabId: number, requestId: number, url: string, initiator: URL, type: string, requestHeaders: Array<{name: string, value:string}>}} request
     *
     * @returns {{requestHeaders: Array<{name: string, value:string}>} | undefined}
     */
    dropTracking3pCookiesFromRequest (request) {
        if (request.type === 'main_frame' || request.requestHeaders.findIndex(header => header.name.toLowerCase() === 'cookie') === -1) {
            return
        }
        const tab = this.tabManager.get({ tabId: request.tabId })
        let requestHeaders = request.requestHeaders

        if (tab) {
            const requestIsTracker = trackerutils.isTracker(request.url)
            if (!this.shouldBlockHeaders(request, tab, requestIsTracker)) {
                return
            }

            // Strip 3rd party response header
            if (!utils.isCookieExcluded(request.url)) {
                requestHeaders = requestHeaders.filter(header => header.name.toLowerCase() !== 'cookie')
                this.devtools.postMessage(request.tabId, 'cookie', {
                    action: 'block',
                    kind: `cookie-${requestIsTracker ? 'tracker' : 'non-tracker'}`,
                    url: request.url,
                    siteUrl: tab?.site?.url,
                    requestId: request.requestId,
                    type: request.type
                })
                if (this.manifestVersion === 2) {
                    return { requestHeaders }
                }
            }
        }
    }

    validateSetCookieBlock (request) {
        if (request.type !== 'main_frame' && this.expectedSetCookieBlocked.has(request.requestId)) {
            const cookieHeader = request.responseHeaders?.find(header => header.name.toLowerCase() === 'set-cookie')
            if (chrome.cookies && cookieHeader) {
                // Unset the cookie that got set erroneously
                const cookieName = cookieHeader.value.split(';')[0].split('=')[0]
                chrome.cookies.remove({
                    name: cookieName,
                    url: request.url
                })
            }
            this.expectedSetCookieBlocked.delete(request.requestId)
        }
    }
}



module.exports = ThirdPartyTrackingCookieBlocking;
