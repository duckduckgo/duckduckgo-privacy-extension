const MAINFRAME_RESET_MS = 3000
const REQUEST_REDIRECT_LIMIT = 7

class HttpsRedirects {
    constructor () {
        this.failedUpgradeUrls = {}
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

        // this URL previously failed, don't try to upgrade it
        if (this.failedUpgradeUrls[request.url]) {
            console.log(`HTTPS: not upgrading, url previously failed: ${request.url}`)
            return false
        }

        if (request.type === 'main_frame') {
            if (this.mainFrameRedirect &&
                    this.mainFrameRedirect.url === request.url) {
                canRedirect = Date.now() - this.mainFrameRedirect.time > MAINFRAME_RESET_MS
            }
        } else if (this.redirectCounts[request.requestId]) {
            canRedirect = this.redirectCounts[request.requestId] < REQUEST_REDIRECT_LIMIT
        }

        // remember this URL as previously failed, don't try to upgrade it
        if (!canRedirect) {
            this.failedUpgradeUrls[request.url] = true
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
