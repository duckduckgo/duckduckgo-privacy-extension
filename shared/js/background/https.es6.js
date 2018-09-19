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
            return reqUrl.replace(/^(http|https):\/\//i, 'https://')
        }

        // If it falls to here, default to reqUrl
        return reqUrl
    }

    setUpgradeInsecureRequestHeader (request) {
        // Only set headers on main frame when page is served over https
        if (request.type === 'main_frame' && request.url && request.url.indexOf('https://') === 0) {
            let headersChanged = false
            let cspHeaderExists = false

            for (const header in request.responseHeaders) {
                // If CSP header exists and doesn't include upgrade-insecure-request
                // directive, append it.
                if (request.responseHeaders[header].name.match(/Content-Security-Policy/i)) {
                    cspHeaderExists = true
                    const cspValue = request.responseHeaders[header].value

                    if (!cspValue.match(/upgrade-insecure-requests/i)) {
                        request.responseHeaders[header].value = 'upgrade-insecure-requests; ' + cspValue
                        headersChanged = true
                    }
                }
                // Make sure to tweak header to allow https resources if site has
                // Access-Control-Allow-Origin header
                if (request.responseHeaders[header].name.match(/Access-Control-Allow-Origin/i)) {
                    const accessControlValue = request.responseHeaders[header].value

                    if (accessControlValue.match(/http:/)) {
                        request.responseHeaders[header].value = accessControlValue.replace(/http:/g, 'https:')
                        headersChanged = true
                    }
                }
            }
            // If no CSP header, add one
            if (!cspHeaderExists) {
                const upgradeInsecureRequests = {
                    name: 'Content-Security-Policy',
                    value: 'upgrade-insecure-requests'
                }
                request.responseHeaders.push(upgradeInsecureRequests)
                headersChanged = true
            }
            // If headers altered at all, return new headers
            if (headersChanged) {
                return {responseHeaders: request.responseHeaders}
            }
        }
        return {}
    }
}

module.exports = new HTTPS()
