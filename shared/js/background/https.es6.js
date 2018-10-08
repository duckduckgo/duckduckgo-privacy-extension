const settings = require('./settings.es6')
const utils = require('./utils.es6')
const BloomFilter = require('jsbloom').filter
const pixel = require('./pixel.es6')

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
        try {
            lists.map(list => {
                if (!list.data) {
                    throw new Error(`HTTPS: ${list.name} missing data`)
                }

                if (list.type === 'upgrade list') {
                    this.upgradeLists.set(list.name, this.createBloomFilter(list))
                } else if (list.type === 'whitelist') {
                    this.whitelist = list.data
                }
            })
            this.isReady = true
            console.log('HTTPS: is ready')
        } catch (e) {
            // a failed setLists update will turn https off
            // validation of the data should happen before calling setLists
            this.isReady = false
            console.log('HTTPS: setLists error, not ready')
            console.log(e)
        }
    }

    // create a new BloomFilter
    // filterData is assumed to be base64 encoded 8 bit typed array
    createBloomFilter (filterData) {
        let bloom = new BloomFilter(filterData.totalEntries, filterData.errorRate)
        let buffer = Buffer.from(filterData.data, 'base64')
        bloom.importData(buffer)
        return bloom
    }

    canUpgradeHost (host) {
        if (!this.isReady) {
            // console.warn('HTTPS: not ready')
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

        // Determine host without stripping 'www',
        const host = utils.extractHostFromURL(reqUrl, true) || ''

        if (host && this.canUpgradeHost(host)) {
            if (isMainFrame) {
                tab.mainFrameUpgraded = true
                this.incrementUpgradeCount('totalUpgrades')
            }

            return reqUrl.replace(/^(http|https):\/\//i, 'https://')
        }

        // If it falls to here, default to reqUrl
        return reqUrl
    }

    // Send https upgrade and failure totals
    sendHttpsUpgradeTotals () {
        const upgrades = settings.getSetting('totalUpgrades')
        const failed = settings.getSetting('failedUpgrades')

        // only send if we have data
        if (upgrades || failed) {
            // clear the counts
            settings.updateSetting('totalUpgrades', 0)
            settings.updateSetting('failedUpgrades', 0)
            pixel.fire('ehs', {'total': upgrades, 'failures': failed})
        }
    }

    // Increment upgrade or failed upgrade settings
    incrementUpgradeCount (setting) {
        let value = parseInt(settings.getSetting(setting)) || 0
        value += 1
        settings.updateSetting(setting, value)
    }
}

module.exports = new HTTPS()
