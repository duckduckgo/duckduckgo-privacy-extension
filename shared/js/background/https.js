const settings = require('./settings')
const utils = require('./utils')
const BloomFilter = require('@duckduckgo/jsbloom').filter
const httpsService = require('./https-service')
const tabManager = require('./tab-manager')
const browserWrapper = require('./wrapper')
const tldts = require('tldts')
const { addSmarterEncryptionSessionRule } = require('./dnr-smarter-encryption')
// as defined in https://tools.ietf.org/html/rfc6761
const PRIVATE_TLDS = ['example', 'invalid', 'localhost', 'test']

const manifestVersion = browserWrapper.getManifestVersion()

function base64ToUint8Array (base64) {
    const binaryString = globalThis.atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
}

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
            lists.forEach(list => {
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
        const bloom = new BloomFilter(filterData.totalEntries, filterData.errorRate)
        const buffer = base64ToUint8Array(filterData.data)
        bloom.importData(buffer)
        return bloom
    }

    /**
     * @param {string} url either domain (example.com) or a full URL (http://example.com/about)
     * @returns {null|boolean|Promise<boolean>} returns true if host can be upgraded, false if it shouldn't be upgraded and a promise if we don't know yet and we are checking against a remote service
     */
    canUpgradeUrl (url) {
        const parsedUrl = tldts.parse(url)
        const host = parsedUrl.hostname

        if (!host) {
            console.warn('HTTPS: Error parsing out hostname', url)
            return false
        }

        if (parsedUrl.isIp) {
            console.warn('HTTPS: hostname is an IP - host is not upgradable', host)
            return false
        }

        // @ts-ignore
        if (host === 'localhost' || PRIVATE_TLDS.includes(parsedUrl.publicSuffix)) {
            console.warn('HTTPS: localhost or local TLD - host is not upgradable', host)
            return false
        }

        if (!this.isReady) {
            console.warn('HTTPS: not ready')
            return null
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

        if (foundInServiceCache === true && manifestVersion === 3) {
            // This domain should be upgraded and is not in the bloom filter.
            // Ensure that we have an upgrade rule in place for it for this session
            addSmarterEncryptionSessionRule(host)
        }
        if (foundInServiceCache !== null) {
            console.log(`HTTPS: Service cache - host is${foundInServiceCache ? '' : ' not'} upgradable`, host)
            return foundInServiceCache
        }

        const serviceCheck = httpsService.checkInService(host)
        if (manifestVersion === 3) {
            // Once we get the result from the service, ensure we add a session upgrade rule
            serviceCheck.then((result) => {
                if (result) {
                    addSmarterEncryptionSessionRule(host)
                }
            }, (e) => {})
        }
        return serviceCheck
    }

    downgradeTab ({ tabId, expectedUrl, targetUrl }) {
        // make sure that tab still has expected url (user could have navigated away or been redirected)
        const tab = tabManager.get({ tabId })

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

        // Skip upgrading sites that have been disabled by user or through broken sites
        if (!tab || !tab.site.isFeatureEnabled('https')) {
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
        if (!['http:', 'ws:'].includes(urlObj.protocol)) {
            return reqUrl
        }

        const isUpgradable = this.canUpgradeUrl(reqUrl)

        // request is not upgradable or extension is not ready yet
        if (isUpgradable === false || isUpgradable === null) {
            return reqUrl
        }

        // create an upgraded URL
        urlObj.protocol = (urlObj.protocol === 'http:') ? 'https:' : 'wss:'
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
            if (manifestVersion === 3) {
                // returning from webRequest won't cause the upgrade, so we have to do it manually with webNavigation
                browserWrapper.changeTabURL(tab.id, upgradedUrl)
            }

            return upgradedUrl
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
