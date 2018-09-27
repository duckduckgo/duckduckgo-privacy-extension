const utils = require('../utils.es6')
const pixel = require('../pixel.es6')
const constants = require('../../../data/constants')

const MAINFRAME_RESET_MS = 3000
const REQUEST_REDIRECT_LIMIT = 7

/**
 * This class protects users from accidentally being sent into a redirect loop
 * if a site we've included into our HTTPS list redirects them back to HTTP.
 *
 * Every redirect we perform on a tab gets registered against an instance of this class.
 * If we hit too many redirects for a request, we block it via canRedirect().
 */

class HttpsRedirects {
    constructor () {
        this.failedUpgradeHosts = {}
        this.redirectCounts = {}

        this.mainFrameRedirect = null
        this.clearMainFrameTimeout = null
    }

    registerRedirect (request) {
        if (request.type === 'main_frame') {
            if (this.mainFrameRedirect &&
                    request.url === this.mainFrameRedirect.url) {
                this.mainFrameRedirect.count += 1
                return
            }

            this.mainFrameRedirect = {
                url: request.url,
                time: Date.now(),
                count: 0
            }

            clearTimeout(this.clearMainFrameTimeout)
            this.clearMainFrameTimeout = setTimeout(this.resetMainFrameRedirect, MAINFRAME_RESET_MS)
        } else {
            this.redirectCounts[request.requestId] = this.redirectCounts[request.requestId] || 0
            this.redirectCounts[request.requestId] += 1
        }
    }

    canRedirect (request) {
        let canRedirect = true

        const hostname = utils.extractHostFromURL(request.url, true)

        // this hostname previously failed, don't try to upgrade it
        if (this.failedUpgradeHosts[hostname]) {
            console.log(`HTTPS: not upgrading ${request.url}, hostname previously failed: ${hostname}`)
            return false
        }

        /**
         * Redirect loop detection is different when the request is for the main frame vs
         * any other request on the page.
         *
         * For main frames, the redirect loop could happen as part of several distinct hits to the same URL
         * (e.g. we saw a case where a site returned 200 and the redirected to HTTP via Javascript)
         *
         * To prevent this, we count main frame hits against the same URL within a short period of time,
         * and if they hit a certain threshold, we block any further attempts to upgrade this URL.
         *
         * We need to keep this threshold high, otherwise users can accidentally trigger redirect protection
         * by trying to open the same URL repeatedly before it's loaded.
         */
        if (request.type === 'main_frame') {
            if (this.mainFrameRedirect &&
                    this.mainFrameRedirect.url === request.url) {
                const timeSinceFirstHit = Date.now() - this.mainFrameRedirect.time

                if (timeSinceFirstHit < MAINFRAME_RESET_MS && this.mainFrameRedirect.count >= REQUEST_REDIRECT_LIMIT) {
                    canRedirect = false
                }
            }
        } else if (this.redirectCounts[request.requestId]) {
            /**
             * For other requests, the server would likely just do a 301 redirect
             * to the HTTP version - so we can use the requestId as an identifier
             */
            canRedirect = this.redirectCounts[request.requestId] < REQUEST_REDIRECT_LIMIT
        }

        // remember this hostname as previously failed, don't try to upgrade it
        if (!canRedirect) {
            if (request.type === 'main_frame') {
                const encodedHostname = encodeURIComponent(hostname)
                const errCode = constants.httpsErrorCodes['downgrade_redirect_loop']
                // Fire pixel on https upgrade failures to allow bad data to be removed from lists
                pixel.fire('ehd', {'url': encodedHostname, error: errCode})
            }

            this.failedUpgradeHosts[hostname] = true
            console.log(`HTTPS: not upgrading, redirect loop protection kicked in for url: ${request.url}`)
        }

        return canRedirect
    }

    /**
     * We regenerate tab objects every time a new main_frame request is made.
     *
     * persistMainFrameRedirect() is used whenever a tab object is regenerated,
     * so we can maintain redirect loop protection across multiple main_frame requests
     */
    persistMainFrameRedirect (redirectData) {
        if (!redirectData) { return }

        // shallow copy to prevent pass-by-reference issues
        this.mainFrameRedirect = Object.assign({}, redirectData)

        // setup reset timeout again
        this.clearMainFrameTimeout = setTimeout(this.resetMainFrameRedirect, MAINFRAME_RESET_MS)
    }

    getMainFrameRedirect () {
        return this.mainFrameRedirect
    }

    resetMainFrameRedirect () {
        clearTimeout(this.clearMainFrameTimeout)
        this.mainFrameRedirect = null
    }
}

module.exports = HttpsRedirects
