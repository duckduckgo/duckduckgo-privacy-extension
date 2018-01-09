(function () {
const load = require('load')
const settings = require('settings')
const utils = require('utils')

let httpsUpgradeList = []

class HTTPS {

    constructor () {
        this.isReady = false
        this.init().then(() => this.isReady = true)

        // in the background, try to update the list:
        this.updateList()

        return this
    }

    init () {
        console.log("HTTPS: init()")

        return new Promise((resolve) => {
            // Try to load the list from local storage
            chrome.storage.local.get('https-upgrade-list', (results) => {
                // if items were found in local storage,
                // use those:
                if (results && results['https-upgrade-list']) {
                    try {
                        httpsUpgradeList = JSON.parse(results['https-upgrade-list'])

                        console.log("HTTPS: init() using upgrade list from local storage")
                        console.log("HTTPS: init() " + httpsUpgradeList.simpleUpgrade.top500.length + " rules loaded")

                        return resolve()
                    } catch(e) {
                        console.log("HTTPS: init() error parsing JSON from local storage")
                    }
                }

                console.log("HTTPS: init() no upgrade list in local storage, loading from local file")

                // fallback to loading smaller list packaged
                // with the extension so we at least have something:
                settings.ready().then(() => {
                    load.JSONfromLocalFile(constants.httpsUpgradeList, (l) => {
                        console.log("HTTPS: init() loaded upgrade list from local file")
                        console.log("HTTPS: init() " + l.simpleUpgrade.top500.length + " rules loaded")

                        httpsUpgradeList = l
                        return resolve()
                    })
                })
            })
        })
    }

    updateList() {
        console.log("HTTPS: updateList()")

        let etag = settings.getSetting('https-etag') || ''
        
        load.loadExtensionFile({
            url: constants.httpsUpgradeListUrl,
            source: 'external',
            etag: etag
        }, (data, res) => {
            console.log("HTTPS: updateList() got updated list from server")

            let newEtag = res.getResponseHeader('etag') || ''

            try {
                // update blacklist in memory
                httpsUpgradeList = JSON.parse(data)

                console.log("HTTPS: updateList() valid server response, swapping it in and saving to local storage")
                console.log("HTTPS: updateList() " + httpsUpgradeList.simpleUpgrade.top500.length + " rules loaded")
                
                // save blacklist locally
                chrome.storage.local.set({ 'https-upgrade-list': data })

                // save new etag for next time
                settings.updateSetting('https-etag', newEtag)
            } catch(e) {
                console.log("HTTPS: updateList() error parsing server response")
            }
        })
    }

    getUpgradeList () {
        return httpsUpgradeList
    }

    getUpgradedUrl (reqUrl, tab, isMainFrame) {

        if (!this.isReady) {
            console.warn('HTTPS: .pipeRequestUrl() this.db is not ready')
            return reqUrl
        }

        // Only deal with http calls
        const protocol = utils.getProtocol(reqUrl).toLowerCase()
        if (!protocol.indexOf('http:') === 0) {
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
        const hosts = [host]

        // Check if host has an entry as a wildcarded subdomain
        const subdomain = utils.extractTopSubdomainFromHost(host)
        if (subdomain && subdomain !== 'www') {
            const wildcard = host.replace(subdomain, '*')
            hosts.push(wildcard)
        }

        // Check for upgrades
        for (let i=0; i<hosts.length; i++) {
            if (httpsUpgradeList.simpleUpgrade.top500.indexOf(hosts[i]) > -1) {
                return reqUrl.replace(/^(http|https):\/\//i, 'https://')
            }
        }

        // If it falls to here, default to reqUrl
        return reqUrl
    }

    /**
     * For debugging/development/test purposes only
     * Tests the .pipeRequestUrl() method 
     * for array of test urls defined below
     */
    testGetUpgradedUrl () {
        // These hosts should always have records that were xhr'd
        // into the client-side db from server
        const testUrls = [
            'http://1337x.to/foo',
            'http://SUbMIt.pandora.com/foo/bar',
            'http://foo.api.roblox.com/sit?stand=false',
            'http://THUMP.vice.com',
            'http://yts.ag'
        ]

        console.log('HTTPS: testGetUgradedUrl() for ' + testUrls.length + ' urls')
        console.time('testGetUpgradedUrlTimer')

        testUrls.forEach((url, i) => {
            const r = this.getUpgradedUrl(url, { site: {}} )
            console.log(r)
            if (i === (testUrls.length - 1)) console.timeEnd('testGetUpgradedUrlTimer')
        })
    }
}

require.scopes.https = new HTTPS()
})()
