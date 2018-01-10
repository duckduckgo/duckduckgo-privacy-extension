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
        this.init()

        return this
    }

    init () {
        console.log("HTTPS: init()")

        // Try to load the list from local storage
        this.getFromStorage().then((items) => {
            console.log("HTTPS: init() found existing list in storage with " + items.length + " items")

            // if there are already items in the list (e.g. the server update somehow
            // finishes faster than the local one) don't overwrite what's there.
            if (!httpsUpgradeList.length) {
                httpsUpgradeList = items
            }
        })

        // And also try to update the list from the server:
        this.updateList()
    }

    updateList() {
        console.log("HTTPS: updateList() check if new list exists")

        let etag = settings.getSetting('https-etag') || ''
        
        // try to load an updated file from the server, passing
        // in the latest etag we have and only calling the callback
        // with the new file if the etag on the server is different:
        load.loadExtensionFile({
            url: constants.httpsUpgradeList,
            source: 'external',
            etag: etag
        }, (data, res) => {
            // This only gets called if the etag is different
            // and it was able to get a new list from the server:
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
