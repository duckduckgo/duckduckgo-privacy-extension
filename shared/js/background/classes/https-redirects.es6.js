const MAINFRAME_RESET_MS = 3000

class HttpsRedirects {
    constructor () {
        this.failedUpgradeUrls = {}
        this.redirectCounts = {}

        this.mainFrameUpgrade = null
        this.clearMainFrameTimeout = null
    }

    registerRedirect (request) {
        if (request.type === 'main_frame') {
            this.mainFrameUpgrade = {
                url: request.url,
                time: Date.now()
            }

            clearTimeout(this.clearMainFrameTimeout)
            this.clearMainFrameTimeout = setTimeout(this.resetMainFrameRedirect, MAINFRAME_RESET_MS)
        }
    }

    canRedirect (request) {
        if (request.type === 'main_frame') {
            if (this.mainFrameUpgrade &&
                    this.mainFrameUpgrade.url === request.url) {
                return Date.now() - this.mainFrameUpgrade.time > MAINFRAME_RESET_MS
            }

            return true
        }

        return true
    }

    persistMainFrameRedirect (redirectData) {
    }

    getMainFrameRedirect () {
    }

    resetMainFrameRedirect () {
        clearTimeout(this.clearMainFrameTimeout)
        this.mainFrameUpgrade = null
    }
}

module.exports = HttpsRedirects
