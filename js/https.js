(function () {
const db = require('db')
const settings = require('settings')
let knownMixedContentList

settings.ready().then(() => {
    load.JSONfromLocalFile(settings.getSetting('httpsWhitelist'), (wl) => knownMixedContentList = wl)
})

class HTTPS {

    constructor () {
        this.isReady = false
        this.db = null
        this.dbObjectStore = 'https'
        db.ready().then(() => { 
          this.isReady = true
          this.db = db 
        })

        return this
    }  

    pipeRequestUrl (reqUrl, tab, isMainFrame) {
        return new Promise((resolve) => {
            if (!this.isReady) {
                console.warn('HTTPS: .pipeRequestUrl() this.db is not ready')
                return resolve(reqUrl)
            }

            reqUrl = reqUrl.toLowerCase()

            // Only deal with http calls
            const protocol = utils.getProtocol(reqUrl)
            if (!protocol.indexOf('http:') === 0) return resolve(reqUrl)

            // Obey global settings (options page)
            if (!settings.getSetting('httpsEverywhereEnabled')) return resolve (reqUrl)

            // Skip upgrading sites that have been whitelisted by user 
            // via on/off toggle in popup
            if (tab.site.whitelisted) {
                console.log(`HTTPS: ${tab.site.domain} was whitelisted by user. skip upgrade check.`)  
                return resolve(reqUrl)
            }

            // Skip upgrading sites that have been 'HTTPSwhitelisted'
            // bc they contain mixed https content when forced to upgrade
            if (tab.site.HTTPSwhitelisted) {
                console.log(`HTTPS: ${tab.site.domain} has known mixed content. skip upgrade check.`)  
                return resolve(reqUrl)
            }

            // If `isMainFrame` request and host has known mixed content, 
            // skip db check (don't force upgrade)
            if (isMainFrame) {
                if (knownMixedContentList && knownMixedContentList[tab.site.domain]) {
                    console.log(`HTTPS: ${tab.site.domain} has known mixed content. skip upgrade check.`)  
                    return resolve(reqUrl)
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

            // Check db
            let isResolved = false
            loop.forEach((r, i) => {
                if (isResolved) return
                this.db
                    .get(this.dbObjectStore, r)
                    .then(
                        (record) => {
                            if (record && record.simpleUpgrade) {
                                const upgrade = reqUrl.replace(/^(http|https):\/\//, 'https://')
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

            })

        })
    }

    /* For debugging/development/test purposes only */
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

    /* For debugging/development/test purposes only */
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

    /* For debugging/development/test purposes only */
    testPipeRequestUrl () {
        // These hosts should always have records that were xhr'd 
        // into the client-side db from server
        const testUrls = [
            'http://1337x.to/foo',
            'http://submit.pandora.com/foo/bar',
            'http://foo.api.roblox.com/sit?stand=false',
            'http://thump.vice.com',
            'http://yts.ag'
        ]
        console.log('HTTPS: testPipeRequestUrl() for ' + testUrls.length + ' urls')

        function _handleDone (r, i) {
            // console.log(r)
            if (i === (testUrls.length - 1)) console.timeEnd('testPipeRequestUrlTimer')
        }

        console.time('testPipeRequestUrlTimer')
        testUrls.forEach((url, i) => {
            this.pipeRequestUrl(url, { site: {}} )
                .then((r) => _handleDone(r, i),
                      (r) => _handleDone(r, i))
        })     
    }

    /* For debugging/development/test purposes only */
    logAllRecords () {
        this.db.logAllRecords(this.dbObjectStore)      
    }
}

require.scopes.https = new HTTPS()
})()
