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
            const protocol = URLParser.extractProtocol(reqUrl).protocol
            if (!protocol.indexOf('http') === 0) resolve(reqUrl)

            const host = utils.extractHostFromURL(reqUrl)
            this.db.get(this.dbObjectStore, host).then(
                (record) => {
                    if (record && record.simpleUpgrade) {
                        // TODO: deal with wildcard records in db
                        const upgrade = reqUrl.replace(/^(http|https):\/\//, 'https://')
                        return resolve(upgrade)
                    }
                    return resolve(reqUrl)
                },
                () => {
                    console.warn('HTTPSE: pipeRequestUrl() encountered a db error')
                    return resolve(reqUrl)
                }
            )
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
