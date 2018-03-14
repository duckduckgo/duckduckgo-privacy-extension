const load = require('./load')
const settings = require('./settings')
const utils = require('./utils')
const constants = require('../data/constants')
const Dexie = require('dexie')

// check every 30 minutes for an updated list:
const UPDATE_INTERVAL = 1000 * 60 * 30

// chrome.storage.local can be unlimited, and
// localStorage in Safari claims it can go up to 100MB,
// but Safari seems to throw an error if the size of an
// individual item in localStorage is greater than 2.5MB,
// so this size will restict the # of characters we save
// per item, chunking it up into n items that won't throw errors:
// https://jsfiddle.net/53xcc4LL/
// http://dev-test.nemikor.com/web-storage/support-test/
const LOCAL_STORAGE_MAX_ITEM_LENGTH = 1000000

let httpsUpgradeList = []

class Timer {
    constructor(name) {
        this.name = name;
    }

    time(name) {
        this[name] = Date.now();
    }

    timeEnd(name) {
        this[name + 'End'] = Date.now();
    }

    done() {
        let timeToAdd = this.addEnd - this.add;
        let timeToGet = this.getEnd - this.get;
      console.log(this);
        $("body").append(`<div>
          <h2>${this.name}</h2>
          <p>Time to add records: ${timeToAdd}ms</p>
          <p>Time to get records: ${timeToGet}ms</p>
        </div>`);
    }
}

class HTTPS {

    constructor () {
        // this.init()

        return this
    }

    init () {
        console.log("HTTPS: init()")

        // Try to load the list from local storage
        this.getFromStorage().then((items) => {
            console.log("HTTPS: init() found existing list in storage with " + items.length + " items")

            httpsUpgradeList = items

            // check server for updates:
            settings.ready().then(this.updateList.bind(this))
        },() => {
            console.log("HTTPS: init() failed to get existing list from storage, going to server for updated list.")

            // clear any etag that may be in settings so that it
            // forces updateList to download a new list from the server.
            settings.updateSetting('https-etag', '')

            // and go to the server to pull an update:
            settings.ready().then(this.updateList.bind(this))
        })
    }

    getSites() {
        let url = 'data/contentblocking.json';

        if (this.million) {
            url = 'data/contentblocking1m.json';
        }

        return new Promise((resolve, reject) => {
            load.loadExtensionFile({ url: url }, resolve);
        });
    }

    loadListViaLocalStorage() {
        const timer = new Timer("local storage");
        return new Promise((resolve, reject) => {
            this.getSites().then((list) => {
                timer.time("add");
                chrome.storage.local.set({ 'https-upgrade-list': list });
                timer.timeEnd("add");

                timer.time("get");
                chrome.storage.local.get('https-upgrade-list', function () {
                    timer.timeEnd("get");

                    timer.done();
                    chrome.storage.local.clear();

                    resolve();
                });
            });
        });
    }

    loadListViaDexieAsTextBlob() {
        const timer = new Timer("dexie as JSON text blob");
        return new Promise((resolve, reject) => {
            const db = new Dexie('https_blob');
            db.version(1).stores({
                rules: '++id'
            });

            this.getSites().then((list) => {
                timer.time("add");
                return db.rules.put({ list: list });
            }).then(() => {
                timer.timeEnd("add");

                timer.time("get")
                return db.rules.get(1);
            }).then(() => {
                timer.timeEnd("get")

                timer.done();
                return db.delete();
            }).then(() => {

                resolve();
            });
        });
    }

    loadListViaDexieAsObjectBlob() {
        const timer = new Timer("dexie as object");
        return new Promise((resolve, reject) => {
            const db = new Dexie('https_blob');
            db.version(1).stores({
                rules: '++id'
            });

            this.getSites().then((list) => {
                list = JSON.parse(list)

                timer.time("add");
                return db.rules.put({ list: list })
            }).then(() => {
                timer.timeEnd("add");

                timer.time("get")
                return db.rules.get(1);
            }).then(() => {
                timer.timeEnd("get")

                timer.done();
                return db.delete();
            }).then(() => {
                resolve();
            });
        });
    }

    updateList() {
        let etag = settings.getSetting('https-etag') || ''
        let url = constants.httpsUpgradeList

        // for safari append a querystring param so that we can
        // serve a different list if needed:
        if (window.safari) {
            url += '&b=safari'
        }

        console.log("HTTPS: updateList() check if new list exists at: " + url)
        
        // try to load an updated file from the server, passing
        // in the latest etag we have and only calling the callback
        // with the new file if the etag on the server is different:
        load.loadExtensionFile({
            url: url,
            source: 'external',
            etag: etag
        }, (data, res) => {
            // This only gets called if the etag is different
            // and it was able to get a new list from the server:
            console.log("HTTPS: updateList() got updated list from server")

            let newEtag = res.getResponseHeader('etag') || ''

            try {
                // update list in memory
                let parsedData = JSON.parse(data)

                httpsUpgradeList = parsedData
                console.log("HTTPS: updateList() new list has " + httpsUpgradeList.length + " items")
                
                // save the full data response to storage
                // so we don't have to re-stringify the parsed JSON object:
                this.saveToStorage(data)

                // save new etag for next time
                settings.updateSetting('https-etag', newEtag)
                console.log("HTTPS: updateList() updated https-etag to " + newEtag)

            } catch(e) {
                console.log("HTTPS: updateList() error parsing server response")
            }
        })

        // schedule the next check:
        setTimeout(this.updateList.bind(this), UPDATE_INTERVAL)
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

            // See comment at top of the file. Need to chunk it up for Safari/localStorage
            // because individual items in localStorage seem to have a 2.5MB limit.
            const chunkSize = LOCAL_STORAGE_MAX_ITEM_LENGTH
            const numChunks = Math.ceil(data.length / chunkSize)
            for (let i=0; i<numChunks; i++) {
                localStorage['https-upgrade-list' + i] = data.substr(i*chunkSize, chunkSize)
            }
        }
    }

    canUpgradeHost (host) {
        return (httpsUpgradeList.indexOf(host) > -1) ? true : false
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
            if (this.canUpgradeHost(hosts[i])) {
                return reqUrl.replace(/^(http|https):\/\//i, 'https://')
            }
        }

        // If it falls to here, default to reqUrl
        return reqUrl
    }

    /* For debugging/development/test purposes only
     * Tests the .canUpgradeHost() method against an array of test hosts
     * defined below
     */
    testCanUpgradeHost () {
        // These hosts should always have records that were xhr'd
        // into the client-side db from server
        const testHosts = [
            '1337x.to',
            'submit.pandora.com',
            '*.api.roblox.com',
            'thump.vice.com',
            'yts.ag'
        ]

        let passed = true

        // Test that host records exist after db install from server
        testHosts.forEach((host, i) => {
            if (this.canUpgradeHost(host)) {
                console.log('HTTPS: retrieved record for host: ' + host)
            } else {
                passed = false
                console.error('HTTPS: could not find record for host: ' + host)
            }
        })

        return passed
    }

    /**
     * For debugging/development/test purposes only
     * Tests the .getRequestUrl() method 
     * for array of test urls defined below
     */
    testGetUpgradedUrl () {
        const testUrls = [
            // These hosts should always have records that were xhr'd
            // into the client-side db from server
            ['http://1337x.to/foo',                         'https://1337x.to/foo'],
            ['http://SUbMIt.pandora.com/foo/bar',           'https://SUbMIt.pandora.com/foo/bar'],
            ['http://foo.api.roblox.com/sit?stand=false',   'https://foo.api.roblox.com/sit?stand=false'],
            ['http://THUMP.vice.com',                       'https://THUMP.vice.com'],
            ['http://yts.ag',                               'https://yts.ag'],
            // If it's already https, it should be the same:
            ['https://duckduckgo.com',                      'https://duckduckgo.com'],
            // If it's not in the list, it should stay http:
            ['http://fdsakljfsa.fr',                        'http://fdsakljfsa.fr']
        ]

        let passed = true

        console.log('HTTPS: testGetUgradedUrl() for ' + testUrls.length + ' urls')

        testUrls.forEach((test, i) => {
            const r = this.getUpgradedUrl(test[0], { site: {}} )

            if (r === test[1]) {
                console.log('HTTPS: getUpgradedUrl("' + test[0] + '") returned the expected value: ' + r)
            } else {
                passed = false
                console.error('HTTPS: getUpgradedUrl("' + test[0] + '") returned: ' + r + ', expected: ' + test[1])
            }
        })

        return passed
    }
}

module.exports = new HTTPS()
