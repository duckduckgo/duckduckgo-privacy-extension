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
                    this.createBloomFilter(list.data).then(bloom => { 
                        resolve(this.upgradeLists.set(list.name, bloom))
                    }).catch((e) => {
                        reject(e)
                    })
                } else if (list.type === 'whitelist') {
                    resolve(this.whitelist = list.data)
                }
            })
        })).then(() => {
            this.isReady = true
            console.log('HTTPS: is ready')
        }).catch((e) => {
            this.isReady = false
            console.log(e)
            console.log('HTTPS: error, not ready')
        })
    }

    // create a new BloomFilter
    // filterData is assumed to be base64 encoded 8 bit typed array
    createBloomFilter (filterData) {
        return new Promise((resolve, reject) => {
            let bloom = new BloomFilter(filterData.totalEntries, filterData.errorRate)
            let buffer = Buffer.from(filterData.bloomFilter, 'base64')
            
            this.hasCorrectChecksum(buffer, filterData.checksum).then(hasValidData => {
                if (hasValidData) {
                    bloom.importData(buffer)
                    resolve(bloom)
                } else {
                    reject(new Error('HTTPS: invalid bloom filter data. checksum failed'))
                }
            })
        })
    }

    hasCorrectChecksum (buffer, checksum) {
        return new Promise((resolve, reject) => {
            crypto.subtle.digest("SHA-256", buffer).then(arrayBuffer => {
                let sha256 = Buffer.from(arrayBuffer).toString('base64')
                if (checksum.sha256 && checksum.sha256 === sha256) {
                    resolve(true)
                } else {
                    resolve(false)
                }
            })
        })
    }

    canUpgradeHost (host) {
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
