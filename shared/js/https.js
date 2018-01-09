(function () {
const load = require('load')
const settings = require('settings')
const utils = require('utils')

// number of chunks to split up the data
// when storing to Safari to avoid over quota issues:
const LOCAL_STORAGE_CHUNKS = 5

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
            this.getFromStorage().then((items) => {

                // if items were found in local storage,
                console.log("HTTPS: init() found existing list in storage with " + items.length + " items")
                httpsUpgradeList = items
                return resolve()

            }, () => {

                // if it fails to find anything in local storage,
                // load from the json file packaged with the extension
                console.log("HTTPS: init() nothing found in storage, loading from local file")

                settings.ready().then(() => {
                    load.JSONfromLocalFile(constants.httpsUpgradeList, (items) => {
                        console.log("HTTPS: init() loaded upgrade list from local file with " + items.length + " items")
                        httpsUpgradeList = items
                        return resolve()
                    })
                })
            })
        })
    }

    updateList() {
        console.log("HTTPS: updateList() check if new list exists")

        let etag = settings.getSetting('https-etag') || ''
        
        load.loadExtensionFile({
            url: constants.httpsUpgradeListUrl,
            source: 'external',
            etag: etag
        }, (data, res) => {
            // this only gets called if the etag is different
            // and it was able to get a new list
            console.log("HTTPS: updateList() got updated list from server")

            let newEtag = res.getResponseHeader('etag') || ''

            try {
                // update list in memory
                httpsUpgradeList = JSON.parse(data)
                console.log("HTTPS: updateList() new list has " + httpsUpgradeList.length + " items")
                
                this.saveToStorage(data)

                // save new etag for next time
                settings.updateSetting('https-etag', newEtag)
                console.log("HTTPS: updateList() updated https-etag to " + newEtag)

            } catch(e) {
                console.log("HTTPS: updateList() error parsing server response")
            }
        })
    }

    getFromStorage (fn) {
        return new Promise((resolve, reject) => {
            // For Chrome/Firefox:
            if (window.chrome) {
                console.log("HTTPS: getFromStorage() using chrome.storage.local (Chrome/FF)")

                chrome.storage.local.get('https-upgrade-list', (results) => {
                    if (!results || !results['https-upgrade-list']) {
                        return reject()
                    }

                    try {
                        let parsedList = JSON.parse(results['https-upgrade-list'])
                        resolve(parsedList)
                    } catch(e) {
                        console.log("HTTPS: getFromStorage() error parsing JSON from chrome.storage.local", e)
                        reject()
                    }
                })

            // For Safari
            } else if (window.localStorage) {
                console.log("HTTPS: getFromStorage() using localStorage (Safari)")

                if (!window.localStorage || !localStorage['https-upgrade-list0']) {
                    return reject()
                }

                let data = ''
                for (let i=0; i<LOCAL_STORAGE_CHUNKS; i++) {
                    data += localStorage['https-upgrade-list' + i]
                }

                try {
                    let parsedList = JSON.parse(data)
                    resolve(parsedList)
                } catch(e) {
                    console.log("HTTPS: getFromStorage() error parsing JSON from localStorage", e)
                    reject()
                }
            } else {
                reject()
            }
        })
    }

    saveToStorage (data) {
        // For Chrome/FF:
        if (window.chrome) {
            console.log("HTTPS: saveToStorage() using chrome.storage.local (Chrome/FF)")

            chrome.storage.local.set({ 'https-upgrade-list': data })

        // For Safari:
        } else if (window.localStorage) {
            console.log("HTTPS: saveToStorage() using localStorage (Safari)")

            // Need to chunk it for safari or else
            // it throws a quota exceeded error
            let chunkSize = Math.floor(data.length / LOCAL_STORAGE_CHUNKS)
            for (let i=0; i<LOCAL_STORAGE_CHUNKS; i++) {
                localStorage['https-upgrade-list' + i] = data.substr(i*chunkSize, chunkSize)
            }
        }
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
            if (httpsUpgradeList.indexOf(hosts[i]) > -1) {
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
