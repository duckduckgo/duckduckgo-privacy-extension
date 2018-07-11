const settings = require('./settings.es6')
const utils = require('./utils.es6')
const BloomFilter = require('jsbloom').filter

class HTTPS {
    constructor () {
        // Store multiple upgrades lists keyed by list name
        this.upgradeLists = new Map()
        // One whitelist arrray
        this.whitelist = []
        this.isReady = false
    }

    // Sets a list by type and name. This is data that
    // is gathered from HTTPSStorage.
    // 'upgrade list' is assumed to be a bloom filter
    // 'whitelist' is an array
    setLists (lists) {
        Promise.all(lists.map(list => {
            return new Promise((resolve, reject) => {
                if (!list.data) {
                    reject(new Error(`HTTPS: ${list.name} missing data`))
                }
                    
                if (list.type === 'upgrade list') {
                    this.upgradeLists.set(list.name,  this.createBloomFilter(list.data))
                } else if (list.type === 'whitelist') {
                    this.whitelist = list.data
                }
                resolve()
            })
        })).then(() => {
            this.isReady = true
            console.log('HTTPS: is ready')
        }).catch((e) => {
            // a failed setLists update will turn https off
            // validation of the data should happen before calling setLists
            this.isReady = false
            console.log('HTTPS: setLists error, not ready')
        })
    }

    // create a new BloomFilter
    // filterData is assumed to be base64 encoded 8 bit typed array
    createBloomFilter (filterData) {
        let bloom = new BloomFilter(filterData.totalEntries, filterData.errorRate)
        let buffer = Buffer.from(filterData.bloomFilter, 'base64')    
        bloom.importData(buffer)
        return bloom
    }

    canUpgradeHost (host) {
        if (!this.isReady) {
            console.warn('HTTPS: not ready')
            return false
        }

        if (this.whitelist.includes(host)) {
            return false
        }

        return Array.from(this.upgradeLists.values()).some(list => list.checkEntry(host)) 
    }

    getUpgradedUrl (reqUrl, tab, isMainFrame) {
        if (!this.isReady) {
            console.warn('HTTPS: not ready')
            return reqUrl
        }

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
