const settings = require('./settings.es6')
const utils = require('./utils.es6')
const BloomFilter = require('jsbloom').filter
const pixel = require('./pixel.es6')
const httpsService = require('./https-service.es6')

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

    /**
     * @param {string} host
     * @returns {Boolean|Promise<Boolean>} returns true if host can be upgraded, false if it shouldn't be upgraded and a promise if we don't know yet and we are checking against a remote service
     */
    canUpgradeHost (host) {
        if (!this.isReady) {
            console.warn('HTTPS: not ready')
            return null
        }

        if (this.whitelist.includes(host)) {
            return false
        }

        const foundInPositiveBloomFilter = Array.from(this.upgradeLists.values()).some(list => list.checkEntry(host))

        if (foundInPositiveBloomFilter) {
            console.log('Bloom filter - host is upgradable', host)
            return true
        }

        // TODO foundInNegativeBloomFilter

        const foundInServiceCache = httpsService.checkInCache(host)

        if (foundInServiceCache !== null) {
            console.log(`Service cache - host is${foundInServiceCache ? '' : ' not'} upgradable: ${host}`)
            return foundInServiceCache
        }

        return httpsService.checkInService(host)
    }

    getUpgradedUrl (reqUrl, tab, isMainFrame) {
        if (!this.isReady) {
            console.warn('HTTPS: not ready')
            return reqUrl // should we use service in this case?
        }

        // Obey global settings (options page)
        if (!settings.getSetting('httpsEverywhereEnabled')) {
            return reqUrl
        }

        // Skip upgrading sites that have been whitelisted by user
        // via on/off toggle in popup
        if (tab.site.whitelisted) {
            console.log(`HTTPS: ${tab.site.domain} was whitelisted by user. Skip upgrade check.`)
            return reqUrl
        }

        let urlObj

        try {
            urlObj = new URL(reqUrl)
        } catch (e) {
            // invalid URL
            console.warn(`Invalid url: ${reqUrl}`)
            return reqUrl
        }

        // Only deal with http calls
        if (urlObj.protocol !== 'http:') {
            console.warn(`Not a http request: ${reqUrl}`)
            return reqUrl
        }

        // Determine host without stripping 'www',
        const host = utils.extractHostFromURL(reqUrl, true) || ''

        if (!host) {
            console.warn(`Error parsing out hostname: ${reqUrl}`)
            return reqUrl
        }

        const isUpgradable = this.canUpgradeHost(host)

        // we know that request should not be upgraded
        if (isUpgradable === false) {
            return reqUrl
        }

        // we don't know if request should be upgraded and we are consulting a remote service
        if (isUpgradable instanceof Promise) {
            isUpgradable
                .then(result => {
                    if (result === false) {
                        // TODO downgrade the tab
                        console.log('Remote check returned - downgrade request', reqUrl)
                    } else {
                        console.log('Remote check returned - let request continue', reqUrl)
                    }
                })
                .catch(e => {
                    console.error('Error connecting to the HTTPS service: ' + e.message)
                })
        }

        // if request is upgradable or if we don't yet know if it is upgradable (we are waiting for a response from a service)
        // upgrade the request to HTTPS

        if (isMainFrame) {
            tab.mainFrameUpgraded = true
            this.incrementUpgradeCount('totalUpgrades')
        }

        urlObj.protocol = 'https:'
        return urlObj.toString()
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
