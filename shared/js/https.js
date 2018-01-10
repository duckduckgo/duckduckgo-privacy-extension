(function () {
const db = require('db')
const settings = require('settings')
const utils = require('utils')
let knownMixedContentList

settings.ready().then(() => {
    load.JSONfromLocalFile(constants.httpsWhitelist, (wl) => knownMixedContentList = wl)
})

class HTTPS {

    constructor () {
        this.db = null
        this.dbObjectStore = 'https'

        // if this.isSync: load Chrome-only synchronous rules object into memory
        this.isSync = utils.isChromeBrowser() ? true : false
        this.syncRuleCache = {}

        this.isReady = false
        this._ready = this.init().then(() => this.isReady = true)

        return this
    }

    init () {
        return new Promise((resolve) => {
            db.ready().then(() => {
                this.db = db

                if (this.isSync) {
                    this.initSync().then(() => resolve())
                } else {
                    resolve()
                }
            })
        })
    }

    initSync () {
        return new Promise((resolve) => {
            this.db.logAllRecords(this.dbObjectStore, this.syncRuleCache)
            resolve()
        })
    }

    ready () {
        return this._ready
    }

    pipeRequestUrl (reqUrl, tab, isMainFrame) {

        function checkDb (resolve) {
            if (!this.isReady) {
                console.warn('HTTPS: .pipeRequestUrl() this.db is not ready')
                if (this.isSync) { return reqUrl } else { return resolve(reqUrl) }
            }

            // Only deal with http calls
            const protocol = utils.getProtocol(reqUrl).toLowerCase()
            if (!protocol.indexOf('http:') === 0) {
                if (this.isSync) { return reqUrl } else { return resolve(reqUrl) }
            }

            // Obey global settings (options page)
            if (!settings.getSetting('httpsEverywhereEnabled')) {
                if (this.isSync) { return reqUrl } else { resolve(reqUrl) }
            }

            // Skip upgrading sites that have been whitelisted by user
            // via on/off toggle in popup
            if (tab.site.whitelisted) {
                console.log(`HTTPS: ${tab.site.domain} was whitelisted by user. skip upgrade check.`)
                if (this.isSync) { return reqUrl } else { return resolve(reqUrl) }
            }

            // Skip upgrading sites that have been 'HTTPSwhitelisted'
            // bc they contain mixed https content when forced to upgrade
            if (tab.site.HTTPSwhitelisted) {
                console.log(`HTTPS: ${tab.site.domain} has known mixed content. skip upgrade check.`)
                if (this.isSync) { return reqUrl } else { return resolve(reqUrl) }
            }

            // If `isMainFrame` request and host has known mixed content,
            // skip db check (don't force upgrade)
            if (isMainFrame) {
                if (knownMixedContentList && knownMixedContentList[tab.site.domain]) {
                    console.log(`HTTPS: ${tab.site.domain} has known mixed content. skip upgrade check.`)
                    if (this.isSync) { return reqUrl } else { return resolve(reqUrl) }
                }
            }

            // Determine host
            const host = utils.extractHostFromURL(reqUrl)
            const loop = [host]

            // Check if host has an entry as a wildcarded subdomain in db
            const subdomain = utils.extractTopSubdomainFromHost(host)
            if (subdomain && subdomain !== 'www') {
                const wildcard = host.replace(subdomain, '*')
                loop.push(wildcard)
            }

            // Check db for simple upgrades
            let isResolved = false
            let syncUrlResolution = reqUrl // Only used for sync version!
            loop.forEach((r, i) => {
                if (isResolved) return

                if (this.isSync) {
                    if (this.syncRuleCache[r] &&
                        this.syncRuleCache[r].simpleUpgrade &&
                        this.syncRuleCache[r].simpleUpgrade === true) {
                        const upgrade = reqUrl.replace(/^(http|https):\/\//i, 'https://')
                        isResolved = true
                        return syncUrlResolution = upgrade
                    }
                } else {
                    this.db
                        .get(this.dbObjectStore, r.toLowerCase())
                        .then(
                            (record) => {
                                if (record && record.simpleUpgrade) {
                                    const upgrade = reqUrl.replace(/^(http|https):\/\//i, 'https://')
                                    isResolved = true
                                    return resolve(upgrade)
                                }
                                if (i === (loop.length - 1)) return resolve(reqUrl)
                            },
                            () => {
                                console.warn('HTTPS: pipeRequestUrl() encountered a db error')
                                if (i === (loop.length -1)) return resolve(reqUrl)
                            }
                        )
                }
            })

            if (this.isSync) return syncUrlResolution
        }

        if (this.isSync) {
            return checkDb.call(this)
        } else {
            return new Promise((resolve) => checkDb.call(this, resolve))
        }
    }

    /**
     * For debugging/development/test purposes only
     * Logs all records in indexed db to console
     */
    logAllRecords () {
        this.db.logAllRecords(this.dbObjectStore)
    }

    /**
     * For debugging/development/test purposes only
     * This only tests ability to retrieve record from indexed db
     * Usage: .getHostRecord('goodreads.com').then((r) => console.log(r))
     */
    getHostRecord (host) {
        return new Promise ((resolve, reject) => {
            if (!this.isReady) {
                console.warn('HTTPS: this.db is not ready')
                return reject()
            }

            this.db.get(this.dbObjectStore, host).then(
                (record) => {
                    if (record) return resolve(record)
                    return resolve()
                },
                () => {
                    console.warn('HTTPS: getHostRecord() encountered a db error.')
                    return reject()
                }
            )

        })
    }

    /* For debugging/development/test purposes only
     * Tests the .getHostRecord() method against an array of test hosts
     * defined below
     */
    testGetHostRecord (cb) {
        // These hosts should always have records that were xhr'd
        // into the client-side db from server
        const testHosts = [
            '1337x.to',
            'submit.pandora.com',
            '*.api.roblox.com',
            'thump.vice.com',
            'yts.ag'
        ]

        // Test that host records exist after db install from server
        testHosts.forEach((host, i) => {
            this.getHostRecord(host, { site: {} } ).then(
                (record) => {
                    if (record) {
                        console.log('HTTPS: retrieved record for host: ' + host)
                        console.log(record)
                        if (cb && i === (testHosts.length - 1)) return cb()
                        return
                    }
                    console.error('HTTPS: could not find record for host: ' + host)
                    if (cb) cb(new Error('HTTPS: could not find record for host: ' + host))
                },
                () => {
                    console.error('HTTPS: testDBKeys() encountered a db error for host: ' + host)
                    if (cb) cb(new Error('HTTPS: testDBKeys() encountered a db error for host: ' + host))
                }
            )
        })
    }

    /**
     * For debugging/development/test purposes only
     * Tests the .pipeRequestUrl() method in both synchronous (Chrome) and
     * asynchronous modes (depending on browser it is run in) for
     * array of test urls defined below
     */
    testPipeRequestUrl () {
        // These hosts should always have records that were xhr'd
        // into the client-side db from server
        const testUrls = [
            'http://1337x.to/foo',
            'http://SUbMIt.pandora.com/foo/bar',
            'http://foo.api.roblox.com/sit?stand=false',
            'http://THUMP.vice.com',
            'http://yts.ag'
        ]
        console.log('HTTPS: testPipeRequestUrl() for ' + testUrls.length + ' urls')

        function _handleDone (r, i) {
            console.log(r)
            if (i === (testUrls.length - 1)) console.timeEnd('testPipeRequestUrlTimer')
        }

        console.time('testPipeRequestUrlTimer')
        if (this.isSync) {
            testUrls.forEach((url, i) => {
                const r = this.pipeRequestUrl(url, { site: {}} )
                _handleDone(r, i)
            })

        } else {
            testUrls.forEach((url, i) => {
                this.pipeRequestUrl(url, { site: {}} )
                    .then((r) => _handleDone(r, i),
                          (r) => _handleDone(r, i))
            })
        }
    }
}

require.scopes.https = new HTTPS()
})()
