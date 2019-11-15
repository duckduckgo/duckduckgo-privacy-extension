const settings = require('./settings.es6')
const utils = require('./utils.es6')
const BloomFilter = require('jsbloom').filter
const pixel = require('./pixel.es6')
const httpsService = require('./https-service.es6')
const tabManager = require('./tab-manager.es6')
const browserWrapper = require('./$BROWSER-wrapper.es6')
const ip = require('ip')

class HTTPS {
    constructor () {
        // Store multiple upgrade / don't upgrade bloom filters
        this.upgradeBloomFilters = new Map()
        this.dontUpgradeBloomFilters = new Map()
        // Upgrade / don't upgrade safelists for the bloom filters
        this.dontUpgradeList = []
        this.upgradeList = []

        this.isReady = false
    }

    // Sets a list by type and name. This is data that
    // is gathered from HTTPSStorage.
    // 'upgrade bloom filter' and 'don't upgrade bloom filter' are assumed to be bloom filters
    // 'upgrade safelist' and 'don't upgrade safelist' should be arrays
    setLists (lists) {
        try {
            lists.map(list => {
                if (!list.data) {
                    throw new Error(`HTTPS: ${list.name} missing data`)
                }

                if (list.type === 'upgrade bloom filter') {
                    this.upgradeBloomFilters.set(list.name, this.createBloomFilter(list))
                } else if (list.type === 'don\'t upgrade bloom filter') {
                    this.dontUpgradeBloomFilters.set(list.name, this.createBloomFilter(list))
                } else if (list.type === 'upgrade safelist') {
                    this.upgradeList = list.data
                } else if (list.type === 'don\'t upgrade safelist') {
                    this.dontUpgradeList = list.data
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
     * Checks if provided hostname is local (e.g. ::1) or a private (e.g. 192.168.1.1)
     * @param {string} host
     * @returns {boolean} 
     */
    isLocalOrPrivate (host) {
        // if it looks like IP v6 remove [ and ] that wrap it ("[::1]" -> "::1") for ip library to work
        if (host.startsWith('[') && host.endsWith(']')) {
            host = host.slice(1, -1)
        }

        return host === 'localhost' || ip.isPrivate(host)
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

        if (this.isLocalOrPrivate(host)) {
            console.warn('HTTPS: Private IP or localhost - host is not upgradable', host)
            return false
        }

        if (this.dontUpgradeList.includes(host)) {
            console.log('HTTPS: Safelist - host is not upgradable', host)
            return false
        }

        if (this.upgradeList.includes(host)) {
            console.log('HTTPS: Safelist - host is upgradable', host)
            return true
        }

        const foundInDontUpgradeBloomFilters = Array.from(this.dontUpgradeBloomFilters.values()).some(list => list.checkEntry(host))

        if (foundInDontUpgradeBloomFilters) {
            console.log('HTTPS: Bloom filter - host is not upgradable', host)
            return false
        }

        const foundInUpgradeBloomFilters = Array.from(this.upgradeBloomFilters.values()).some(list => list.checkEntry(host))

        if (foundInUpgradeBloomFilters) {
            console.log('HTTPS: Bloom filter - host is upgradable', host)
            return true
        }

        const foundInServiceCache = httpsService.checkInCache(host)

        if (foundInServiceCache !== null) {
            console.log(`HTTPS: Service cache - host is${foundInServiceCache ? '' : ' not'} upgradable`, host)
            return foundInServiceCache
        }

        return httpsService.checkInService(host)
    }

    downgradeTab ({tabId, expectedUrl, targetUrl}) {
        // make sure that tab still has expected url (user could have navigated away or been redirected)
        const tab = tabManager.get({tabId})

        if (tab.url !== expectedUrl && tab.url !== targetUrl) {
            console.warn(`HTTPS: Not downgrading, expected and actual tab URLs don't match: ${expectedUrl} vs ${tab.url}`)
        } else {
            console.log(`HTTPS: Downgrading from ${tab.url} to ${targetUrl}`)
            browserWrapper.changeTabURL(tabId, targetUrl)
        }
    }

    getUpgradedUrl (reqUrl, tab, isMainFrame, isPost) {
        if (!this.isReady) {
            console.warn('HTTPS: not ready')
            return reqUrl
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
            console.warn(`HTTPS: Invalid url - ${reqUrl}`)
            return reqUrl
        }

        // Only deal with http calls
        if (urlObj.protocol !== 'http:') {
            return reqUrl
        }

        // Determine host without stripping 'www'
        const host = utils.extractHostFromURL(reqUrl, true) || ''

        if (!host) {
            console.warn(`HTTPS: Error parsing out hostname - ${reqUrl}`)
            return reqUrl
        }

        const isUpgradable = this.canUpgradeHost(host)

        // request is not upgradable or extension is not ready yet
        if (isUpgradable === false || isUpgradable === null) {
            return reqUrl
        }

        // create an upgraded URL
        urlObj.protocol = 'https:'
        const upgradedUrl = urlObj.toString()

        // request is upgradable
        if (isUpgradable === true) {
            return upgradedUrl
        }

        /**
         * If we got to this point hostname was not recognized by our bloom filters and safelists,
         * we are waiting for a response from our remote service
         */
        if (!(isUpgradable instanceof Promise)) {
            console.error('HTTPS: Fatal error - unexpected type of isUpgradable')
            return reqUrl
        }

        // if this is a non-navigational request (subresource request) let it continue over HTTP
        if (!isMainFrame) {
            return reqUrl
        }

        // if this is a POST navigational request and browser doesn't support async blocking
        // let it continue over HTTP to avoid data loss
        if (isMainFrame && isPost && !utils.getAsyncBlockingSupport()) {
            return reqUrl
        }

        // if async blocking is available:
        // we hold the request until we hear back from our service
        if (utils.getAsyncBlockingSupport()) {
            return isUpgradable
                .then(result => {
                    if (result) {
                        tab.mainFrameUpgraded = true
                        this.incrementUpgradeCount('totalUpgrades')
                    }

                    return result ? upgradedUrl : reqUrl
                })
                .catch(e => {
                    console.error('HTTPS: Error connecting to the HTTPS service: ' + e.message)
                    return upgradedUrl
                })
        } else {
            // if async blocking is NOT available:
            // we upgrade it proactively while waiting for a response from a remote service
            isUpgradable
                .then(result => {
                    if (result === false) {
                        console.info('HTTPS: Remote check returned - downgrade request', reqUrl)

                        this.downgradeTab({
                            tabId: tab.id,
                            expectedUrl: upgradedUrl,
                            targetUrl: reqUrl
                        })
                    } else {
                        console.info('HTTPS: Remote check returned - let request continue', reqUrl)
                    }
                })
                .catch(e => {
                    console.error('HTTPS: Error connecting to the HTTPS service: ' + e.message)
                })

            tab.mainFrameUpgraded = true
            this.incrementUpgradeCount('totalUpgrades')

            return upgradedUrl
        }
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
