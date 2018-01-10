(function () {
const utils = require('utils')

/**
 * Public api
 * Usage:
 * const db = new IndexedDBClient(ops)
 *
 * You can use promise callbacks to check readiness and do a db.get():
 * db.ready().then(() => {
 *    db.get('cats', 'mr_wiggles')
 *        .then(
 *            (record) => console.log(record), // success
 *            () => console.log('doh') // failure
 *        )
 * })
 *
 * Or you can use db.isReady property to check readiness:
 * if (db.isReady) db.get('cats', 'mr_wiggles').then((r) => { // do stuff}))
 *
 * NOTE:
 * db.ready() won't fire until db is populated with fetched https data
 * after extension install.
 * On subsequent boot ups, db.ready() fires as soon as db connection is ready!
 *
 * MDN Indexed DB Docs:
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 */

class IndexedDBClient {

    constructor (ops) {
        ops = ops || {}
        this.dbName = ops.dbName
        this.dbVersion = ops.dbVersion // no floats (decimals) in version #
        this.db = null

        this.serverUpdateUrls = {
            // https: 'http://duckduckgo.com/contentblocking.js?l=https'
            https: 'http://brian.duckduckgo.com/contentblocking.js?l=https2'
            // ...add more here
        }
        this.serverUpdateFails = 0
        this.serverUpdateMaxRetries = 2

        this.isReady = false
        this._ready = init.call(this).then(() => this.isReady = true)

        return this
    }

    // .ready() is sugar for this.db init() promise
    ready () {
        return this._ready
    }

    get (objectStore, record) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                console.warn('IndexedDBClient: this.db does not exist')
                reject()
            }
            const _store = this.db.transaction(objectStore).objectStore(objectStore)
            const _request = _store.get(record)
            _request.onsuccess = (event) => resolve(_request.result)
            _request.onerror = (event) =>  {
                console.warn(`IndexedDBClient: get() record: ${record}. Error: {event}`)
                reject()
            }
        })
    }

    getObjectStore (objectStore) {
        return this.db.transaction(objectStore).objectStore(objectStore)
    }

    deleteDB () {
        console.warn('WARNING: Attempting to delete IndexedDB ' + this.dbName)
        window.indexedDB.deleteDatabase(this.dbName)
    }

    logAllRecords (objectStore, optionalLogObject) {
        console.log(`IndexedDBClient: logAllRecords() for object store: ${objectStore}`)
        console.time('logRecords')
        const _store = this.db.transaction(objectStore).objectStore(objectStore)
        _store.openCursor().onsuccess = function (event) {
            const cursor = event.target.result
            if (cursor) {
                if (optionalLogObject) {
                    optionalLogObject[cursor.key] = cursor.value
                } else {
                    console.log('IndexedDBClient: logAllRecords() key: ' + cursor.key)
                    // console.log(cursor.value)
                }
                cursor.continue()
            } else {
                if (!optionalLogObject) {
                    console.log(`IndexedDBClient: logAllRecords() No more entries for objectStore: ${objectStore}`)
                    console.timeEnd('logRecords')
                }
            }
        }
    }

}

// Private
function init () {
    return new Promise((resolve) => {

        // NOTE: we aren't dealing with vendor prefixed versions
        // only stable implementations of indexedDB
        if (!window.indexedDB) {
            return console.warn('IndexedDBClient: window.indexedDB not found')
        }

        // NOTE: we aren't dealing with Firefox version <55 because of
        // backwards-incompatible storage issues with IndexedDB
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1246615
        const ua = utils.parseUserAgentString()
        if (ua.browser === 'Firefox' && parseInt(ua.majorVersion) < 55) {
            return console.warn('IndexedDBClient: browser is Firefox < 55, skip db init')
        }

        // Make initial db request
        let _request = window.indexedDB.open(this.dbName, this.dbVersion)

        _request.onsuccess = (event) => {
            console.log('IndexedDBClient: open db onsuccess')
            if (!this.db) this.db = event.target.result

            // Start polling for successful xhr call, db install of rules
            checkServerUpdateSuccess.call(this).then(
                () => resolve(),
                () => {
                    this.serverUpdateFails++
                    if (this.serverUpdateFails < this.serverUpdateMaxRetries) {
                        // Try again(!)
                        fetchServerUpdate['https'][this.dbVersion].call(this)
                        checkServerUpdateSuccess.call(this).then(() => resolve())
                    }
                }
            )

            // DEBUG:
            this.db.onerror = function (event2) {
                console.warn('IndexedDBClient: db onerror ' + event2.target.errorCode)
            }
        }

        _request.onerror = (event) => {
            console.warn('IndexedDBClient: open db onerror ' + event.target.error)
        }

        _request.onupgradeneeded = (event) => {
            console.log('IndexedDBClient: current db version is: ' + event.oldVersion)
            console.log('IndexedDBClient: db onupgradeneeded to version: ' + this.dbVersion)
            if (!this.db) this.db = event.target.result

            // LATER: when is more than one db version, this will
            // need to loop thru migrations before fetching server update
            migrate[this.dbName][this.dbVersion]
                .call(this)
                .then(() => {
                    fetchServerUpdate['https'][this.dbVersion].call(this)
                })

        }
    })
}

const migrate = {
'ddgExtension': { // db name
    '1': function () { // db version
        return new Promise((resolve) => {
            const _store = this.db.createObjectStore('https', { keyPath: 'host' })
            _store.transaction.oncomplete = (event) => resolve()
        })
    }
}
}

const fetchServerUpdate = {
'https': { // object store
    '1': function () { // db version
        return new Promise((resolve) => {
            console.log('IndexedDBClient: Requesting https list from server')

            // TODO: delete OLD top500 entries in production!
            // TODO: optimize https.syncRuleCache so its structure is flipped
            //       this.syncRuleCache = { 'hackernews.com': true }

            load.JSONfromExternalFile(
                this.serverUpdateUrls['https'],
                (data, response) => {
                    // TODO: work server response structure out
                    // if (!(data && data.simpleUpgrade && data.simpleUpgrade.top500)) {
                    if (!(data && data.length && data.length > 0)) {
                      console.warn('IndexedDBClient: invalid server response')
                      return
                    }
                    console.log('IndexedDBClient: Received https list from server, inserting into db.')
                    console.time('IndexedDbClientTimer')

                    const records = data // shorthand alias
                    const throttleBatchMS = 30 // amount to wait between batches
                    const batchSize = 20 // how many records to add on the same transaction

                    const finishUpdate = function() {
                        // sync new etag to storage
                        const etag = response.getResponseHeader('etag')
                        if (etag) settings.updateSetting('httpsEverywhereEtag', etag)
                        console.log('IndexedDBClient: Finished writing https upgrade list')
                        console.timeEnd('IndexedDbClientTimer')
                        resolve()
                    }

                    // batch writes to indexed db (disk)
                    // objectStore argument: keeps single transaction alive during batch writes
                    // https://stackoverflow.com/questions/10385364/how-do-you-keep-an-indexeddb-transaction-alive
                    const addBatch = function (batch, objectStore) {
                        if (!batch.length) return
                        const record = {
                          host: batch[0],
                          simpleUpgrade: true,
                          top200k: true
                        }
                        const req = objectStore.add(record)
                        req.onsuccess = function(e) {
                            batch.shift()
                            addBatch(batch, objectStore)
                        }
                        req.onerror = function () {
                            console.error('IndexedDBClient: add() error')
                            batch.shift()
                            addBatch(batch, objectStore)
                        }
                    }

                    const addRecords = function () {
                      if (!records.length) return finishUpdate.call(this)

                      const batch = records.slice(0, batchSize)
                      batch.forEach((host, index) => {
                        records.shift()
                        if (index === (batch.length - 1)) {
                          const objectStore = this.db.transaction('https', 'readwrite').objectStore('https')
                          addBatch(batch, objectStore)
                          // setTimeout and call addBatch() again
                          window.setTimeout(() => {
                            addRecords.call(this)
                          }, throttleBatchMS)
                        }
                      })
                    }

                    addRecords.call(this)
                }
            )
        })
    }
}
}

/**
 * Poll on an interval to check success of:
 * - `https` object store creation in window.indexedDB
 * - rule retrieval via `https` xhr server call
 * - at least one rule from server installed in db
 * - ...more to come
 */
function checkServerUpdateSuccess () {
    return new Promise((resolve, reject) => {
        let timer = null
        let timerCount = 0
        let maxTimerCount = 180
        let intervalMS = 1000

        timer = window.setInterval(() => {
            // LATER: check other server updated types here (ex: trackers)
            const _request = this.getObjectStore('https').count()
            _request.onerror = () => console.log(`IndexedDBClient: checkServerUpdateSuccess() error`)
            _request.onsuccess = (event) => {
                const recordCount = event.target.result
                if (recordCount && recordCount > 0) {
                    window.clearInterval(timer)
                    resolve()
                } else {
                    delete _request
                }
                timerCount++
                if (timerCount > maxTimerCount) {
                    window.clearInterval(timer)
                    reject()
                }
            }
        }, intervalMS)
    })
}

require.scopes.db = new IndexedDBClient({ dbName: 'ddgExtension', dbVersion: '1' })
})()
