// TODO: integrate whitelist from user settings
// let httpsWhitelist
// load.JSONfromLocalFile(settings.getSetting('httpsWhitelist'), (whitelist) => httpsWhitelist = whitelist);

class HTTPSE {

    constructor () {
        this.isReady = false
        this.db = null
        this.dbObjectStore = 'httpse'
        db.ready().then(() => { 
          this.isReady = true
          this.db = db 
        })

        return this
    }  

    pipeRequestUrl (reqUrl) {
        return new Promise((resolve, reject) => {
            if (!this.isReady) {
                console.warn('HTTPSE: .pipeRequestUrl() this.db is not ready')
                return resolve(reqUrl)
            }

            reqUrl = reqUrl.toLowerCase()

            // Only deal with http calls
            const protocol = URLParser.extractProtocol(reqUrl).protocol
            if (!protocol.indexOf('http') === 0) resolve(reqUrl)

            // Check if host has entry in db
            const host = utils.extractHostFromURL(reqUrl)
            const loop = [host]

            // Check if host has an entry as a wildcarded subdomain in db
            const subdomain = utils.extractSubdomainFromHost(host)
            if (subdomain && subdomain !== 'www') {
                const wildcard = host.replace(subdomain, '*')
                loop.push(wildcard)               
            }

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
                            console.warn('HTTPSE: pipeRequestUrl() encountered a db error')
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
                console.warn('HTTPSE: this.db is not ready')
                return reject()
            } 
          
            this.db.get(this.dbObjectStore, host).then(
                (record) => {
                    if (record) return resolve(record)
                    return resolve()
                },
                () => {
                    console.warn('HTTPSE: getHostRecord() encountered a db error.')
                    return reject()
                }
            )

        })
    }

    /* For debugging/development/test purposes only */
    testGetHostRecord () {
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
        testHosts.forEach((host) => {
            this.getHostRecord(host).then(
                (record) => {
                    if (record) {
                        console.log('HTTPSE: retrieved record for host: ' + host)
                        console.log(record)
                        return
                    }
                    console.warn('HTTPSE: could not find record for host: ' + host)
                },
                () => console.error('HTTPSE: testDBKeys() encountered a db error for host: ' + host)
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
        console.log('HTTPSE: testPipeRequestUrl() for ' + testUrls.length + ' urls')

        function _handleDone (r, i) {
            // console.log(r)
            if (i === (testUrls.length - 1)) console.timeEnd('testPipeRequestUrlTimer')
        }

        console.time('testPipeRequestUrlTimer')
        testUrls.forEach((url, i) => {
            this.pipeRequestUrl(url)
                .then((r) => _handleDone(r, i),
                      (r) => _handleDone(r, i))
        })     
    }

    /* For debugging/development/test purposes only */
    logAllRecords () {
        this.db.logAllRecords(this.dbObjectStore)      
    }
}

