// TODO: 
// - sync with etag
// - add "top 500" designation to data from server, add as field to db

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
 * db.ready() won't fire until db is populated with fetched httpse data
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
            httpse: 'http://lauren.duckduckgo.com/contentblocking.js?l=https' 
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

    add (objectStore, record) {
        if (!this.db) {
            return console.warn('IndexedDBClient: this.db does not exist')
        }
        const _store = this.db.transaction(objectStore, 'readwrite').objectStore(objectStore)
        _store.add(record)
    }

    update (objectStore, record) {
        throw 'IndexedDBClient: update() not yet implemented'
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

    /* For debugging/development/test purposes only */
    logAllRecords (objectStore) {
        console.log(`IndexedDBClient: logAllRecords() for object store: ${objectStore}`)
        const _store = this.db.transaction(objectStore).objectStore(objectStore)
        _store.openCursor().onsuccess = function (event) {
            const cursor = event.target.result
            if (cursor) {
                console.log('IndexedDBClient: logAllRecords() key: ' + cursor.key)
                // console.log(cursor.value)
                cursor.continue()
            } else {
                console.log(`IndexedDBClient: logAllRecords() No more entries for objectStore: ${objectStore}`)
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
            console.warn('IndexedDBClient: window.indexedDB not found')
        }

        // Make initial db request
        let _request = window.indexedDB.open(this.dbName, this.dbVersion)

        _request.onsuccess = (event) => {
            console.log('IndexedDBClient: onsuccess')
            if (!this.db) this.db = event.target.result

            // Start polling for successful xhr call, db install of rules
            checkServerUpdateSuccess.call(this).then(
                () => resolve(),
                () => {
                    this.serverUpdateFails++
                    if (this.serverUpdateFails < this.serverUpdateMaxRetries) {
                        // Try again(!)
                        fetchServerUpdate['httpse'][this.dbVersion].call(this)   
                        checkServerUpdateSuccess.call(this).then(() => resolve())
                    }
                }
            )

            // DEBUG:
            // this.db.onerror = function (event2) {
                // This complains about duplicate keys in `httpse` data call:
                // console.warn('IndexedDBClient: db error ' + event2.target.errorCode)
            // }
        }

        _request.onerror = (event) => {
            console.warn('IndexedDBClient: error ' + event.target.error)
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
                    fetchServerUpdate['httpse'][this.dbVersion].call(this)
                })

        }
    })
}

const migrate = {
'ddgExtension': { // db name
    '1': function () { // db version
        console.log('IndexedDBClient: migrate() to version 1')
        return new Promise((resolve) => {
            const _store = this.db.createObjectStore('httpse', { keyPath: 'host' })
            _store.transaction.oncomplete = (event) => resolve()
        })
    }
}
}

const fetchServerUpdate = {
'httpse': { // object store
    '1': function () { // db version
        console.log('IndexedDBClient: fetchServerUpdate() for version 1')
        return new Promise((resolve) => {
            load.JSONfromExternalFile(
                this.serverUpdateUrls['httpse'], 
                (data) => {
                     
                    if (!(data && data.simpleUpgrade && data.simpleUpgrade.length)) {
                        console.warn('IndexedDBClient: invalid server response')
                        return
                    }

                    // Insert each record into db
                    let counter = 1;
                    data.simpleUpgrade.forEach((host, index) => {

                        let record = {
                            host: host,
                            simpleUpgrade: true,
                            lastUpdated: new Date().toString()
                        }

                        this.add('httpse', record)
                        // console.log(`IndexedDB: Added record to object store httpse. Record count: ${counter}`)
                        counter++;

                        // After we've added last record to db
                        if (index === (data.simpleUpgrade.length - 1)) {
                            console.log(`IndexedDBClient: ${data.simpleUpgrade.length} records added to httpse object store`)
                            resolve()
                        }
                    })

                }
            )
        })
    }
}
}

function checkServerUpdateSuccess () {
    return new Promise((resolve, reject) => {
        let timer = null
        let timerCount = 0
        let maxTimerCount = 180
        let intervalMS = 1000

        timer = window.setInterval(() => {
            console.log('TIMER FN EXECUTING')
            // LATER: check other server updated types here (ex: trackers)
            const _request = this.getObjectStore('httpse').count()
            _request.onerror = () => console.log(`IndexedDBClient: checkServerUpdateSuccess() error`)
            _request.onsuccess = (event) => {
                const recordCount = event.target.result
                if (recordCount && recordCount > 0) {
                    window.clearInterval(timer)
                    console.log('TIMER SUCCESS/RESOLVE')
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
