const utils = require('../utils.es6')

const MAINFRAME_RESET_MS = 3000
const REQUEST_REDIRECT_LIMIT = 7

class HttpsRedirects {
    constructor () {
        this.failedUpgradeHosts = {}
        this.redirectCounts = {}

        this.mainFrameRedirect = null
        this.clearMainFrameTimeout = null
    }

    registerRedirect (request) {
        if (request.type === 'main_frame') {
            this.mainFrameRedirect = {
                url: request.url,
                time: Date.now()
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
         * For main frames, the redirect loop could happen like this:
         * 1. We upgrade a page to HTTPS
         * 2. The server gives 200 but prints out some HTML that redirects the page to HTTP
         * 3. We try to upgrade again
         *
         * To prevent this, block redirects to the same URL for the next few seconds
         */
        if (request.type === 'main_frame') {
            if (this.mainFrameRedirect &&
                    this.mainFrameRedirect.url === request.url) {
                canRedirect = Date.now() - this.mainFrameRedirect.time > MAINFRAME_RESET_MS
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
            this.failedUpgradeHosts[hostname] = true
            console.log(`HTTPS: not upgrading, redirect loop protection kicked in for url: ${request.url}`)
        }

        return canRedirect
    }

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
