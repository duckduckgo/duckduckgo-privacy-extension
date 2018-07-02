const settings = require('./settings.es6')
const utils = require('./utils.es6')
const constants = require('../../data/constants')
const httpsStorage = require('./storage/https.es6.js')

class HTTPS {
    constructor () {
        this.bloom = {}
        this._isReady = httpsStorage.ready().then(() => { return true })
    }

    canUpgradeHost (host) {
        if (this._isReady) {
            return httpsStorage.bloom.checkEntry(host)
        } else {
            console.log('https not ready yet')
            return false
        }
    }

    getUpgradedUrl (reqUrl, tab, isMainFrame) {
        // Only deal with http calls
        const protocol = utils.getProtocol(reqUrl).toLowerCase()
        if (protocol !== 'http:') {
            return reqUrl
        }

        // Obey global settings (options page)
        if (!settings.getSetting('httpsEverywhereEnabled')) {
            return reqUrl
        }

        // Skip upgrading sites that have been whitelisted by user
        // via on/off toggle in popup
        if (tab.site.whitelisted) {
            console.log(`HTTPS: ${tab.site.domain} was whitelisted by user. skip upgrade check.`)
            return reqUrl
        }

        // Determine host
        const host = utils.extractHostFromURL(reqUrl)

        if (this.canUpgradeHost(host)) {
            return reqUrl.replace(/^(http|https):\/\//i, 'https://')
        }

        // If it falls to here, default to reqUrl
        return reqUrl
    }
}

module.exports = new HTTPS()
