const settings = require('./settings.es6')
const utils = require('./utils.es6')
const BloomFilter = require('jsbloom').filter
const pixel = require('./pixel.es6')
const httpsService = require('./https-service.es6')
const tabManager = require('./tab-manager.es6')
const browserWrapper = require('./$BROWSER-wrapper.es6')

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

        const foundInServiceCache = httpsService.checkInCache(host)

        if (foundInServiceCache !== null) {
            console.log(`Service cache - host is${foundInServiceCache ? '' : ' not'} upgradable: ${host}`)
            return foundInServiceCache
        }

        return httpsService.checkInService(host)
    }

    downgradeTab ({tabId, expectedUrl, targetUrl}) {
        // make sure that tab still has expected url (user could have navigated away or been redirected)
        const tab = tabManager.get({tabId})

        //TODO is tabManager data up to date?

        if (tab.url !== expectedUrl && tab.url !== targetUrl) {
            console.warn(`Not downgrading, expected and actual tab URLs don't match: ${expectedUrl} vs ${tab.url}`)
        } else {
            browserWrapper.changeTabURL(tabId, targetUrl)
        }
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
            // console.warn(`Not a http request: ${reqUrl}`)
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

        // create an upgraded URL
        urlObj.protocol = 'https:'
        const upgradedUrl = urlObj.toString()

        // if this is a non-navigational request, upgrade it if we know that it can be upgraded,
        // continue as http otherwise
        if (!isMainFrame) {
            return (isUpgradable === true) ? upgradedUrl : reqUrl
        }

        // if this is a navigational request and we don't yet know if it is upgradable
        // we upgrade it proactively while waiting for a response from a remote service
        if (isUpgradable instanceof Promise) {
            isUpgradable
                .then(result => {
                    if (result === false) {
                        console.info('Remote check returned - downgrade request', reqUrl)

                        this.downgradeTab({
                            tabId: tab.id,
                            expectedUrl: upgradedUrl,
                            targetUrl: reqUrl
                        })
                    } else {
                        console.info('Remote check returned - let request continue', reqUrl)
                    }
                })
                .catch(e => {
                    console.error('Error connecting to the HTTPS service: ' + e.message)
                })
        }

        tab.mainFrameUpgraded = true
        this.incrementUpgradeCount('totalUpgrades')

        return upgradedUrl
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
