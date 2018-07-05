const settings = require('./settings.es6')
const utils = require('./utils.es6')
const BloomFilter = require('jsbloom').filter

class HTTPS {
    constructor () {
        // Store multiple upgrades lists keyed by list name
        this.upgradeLists = {}
        // One whitelist arrray
        this.whitelist = []
        this.isReady = false
    }

    // Sets a list by type and name. This is data that
    // is gathered from HTTPSStorage.
    // 'upgrade list' is assumed to be a bloom filter
    // 'whitelist' is an array
    setLists (lists) {
        lists.forEach((list) => {
            if (!list.data) return

            if (list.type === 'upgrade list') {
                let name = list.name
                this.upgradeLists[name] = this.createBloomFilter(list.data)
            } else if (list.type === 'whitelist') {
                this.whitelist = list.data
            }
        })

        this.isReady = true
    }

    // create a new BloomFilter
    // filterData is assumed to be base64 encoded 8 bit typed array
    createBloomFilter (filterData) {
        let bloom = new BloomFilter(filterData.totalEntries, filterData.errorRate)
        bloom.importData(Buffer.from(filterData.bloomFilter, 'base64'))
        return bloom
    }

    canUpgradeHost (host) {
        if (this.whitelist.indexOf(host) !== -1) {
            return false
        }

        let canUpgrade = false
        Object.keys(this.upgradeLists).some((listName) => {
            canUpgrade = this.upgradeLists[listName].checkEntry(host)
            return canUpgrade === true
        })

        return canUpgrade
    }

    getUpgradedUrl (reqUrl, tab, isMainFrame) {
        if (!this.isReady) return reqUrl

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
