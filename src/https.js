let tldjs = require('tldjs')
let utils = require('./utils')

class HTTPS {
    addLists (rules) {
        this.rules = rules
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
        if (!this.rules) {
            throw new Error('tried to upgrade hosts before rules were loaded')
        }

        return this.rules.indexOf(host) > -1
    }
}

module.exports = new HTTPS()
