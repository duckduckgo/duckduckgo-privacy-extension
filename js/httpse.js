// TODO: perf open question
//   - are individual db lookups as fast as holding rules in memory?

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
                console.warn('HTTPSE: this.db is not ready')
                return resolve(reqUrl)
            }

            this.db.get(this.dbObjectStore, reqUrl).then(
                (record) => {
                    if (record && record.simpleUpgrade) {
                        return resolve(upgradedUrl)
                    }
                    return resolve(reqUrl)
                },
                () => {
                    console.warn('HTTPSE: pipeRequestUrl() encountered a db error.')
                    return resolve(reqUrl)
                }
            )
        })
    }

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
    logAllRecords () {
        this.db.logAllRecords(this.dbObjectStore)      
    }
}
