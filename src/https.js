let utils = require('./utils')

class HTTPS {
    addLists (lists) {
        this.httpsList = lists.https
        this.httpsAutoUpgradeList = lists.httpsAutoUpgrade
    }

    getUpgradedUrl (url) {
        // Only deal with http calls
        if (url.indexOf('http:') !== 0) {
            return url
        }

        // Determine host
        const host = utils.extractHostFromURL(url)

        if (this.canUpgradeHost(host)) {
            return url.replace(/^(http|https):\/\//i, 'https://')
        }

        // If it falls to here, default to url
        return url
    }

    canUpgradeHost (host) {
        if (!this.httpsList) {
            throw new Error('tried to upgrade hosts before rules were loaded')
        }

        return this.httpsList.indexOf(host) > -1
    }

    hostAutoUpgrades (host) {
        if (!this.httpsAutoUpgradeList) {
            throw new Error('tried to upgrade hosts before rules were loaded')
        }

        return this.httpsAutoUpgradeList.indexOf(host) > -1
    }
}

module.exports = new HTTPS()
