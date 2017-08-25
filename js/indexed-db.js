// TODO: handle server update interruptions:
//  - interrupted db connections
//  - server update calls that 404 on first try
//  - profile mismatches in Firefox

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
        this.isReady = false
        this._ready = init.call(this).then(() => this.isReady = true)
        this.serverUpdateUrls = {
            httpse: 'http://lauren.duckduckgo.com/collect.js?type=httpse' 
            // ...add more here
        }

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
    return new Promise((resolve, reject) => {

        // NOTE: we aren't dealing with vendor prefixed versions
        // only stable implementations of indexedDB
        if (!window.indexedDB) {
            console.warn('IndexedDBClient: window.indexedDB not found')
        }

        // Make initial db request
        let _request = window.indexedDB.open(this.dbName, this.dbVersion)

        _request.onsuccess = (event) => {
            console.log('IndexedDBClient: onsuccess')
            this.db = event.target.result
            this.db.onerror = function (event2) {
                // This complains about duplicate keys in `httpse` data call:
                // console.warn('IndexedDBClient: db error ' + event2.target.errorCode)
            }
            // Start polling for successful xhr call, db install
            checkServerUpdateSuccess.call(this).then(() => resolve())
        }

        _request.onerror = (event) => {
            console.warn('IndexedDBClient: error ' + event.target.error)
        }

        _request.onupgradeneeded = (event) => {
            console.log('IndexedDBClient: onupgradeneeded to version ' + this.dbVersion)
            console.log('IndexedDBClient: current version before upgrade is: ' + event.oldVersion)
            this.db = event.target.result
            handleUpgradeNeeded.apply(this, [resolve])
        }

    })
}

// Handles db init on extension install + future db migrations
function handleUpgradeNeeded (resolve) {
    console.log('IndexedDBClient: handleUpgradeNeeded()')

    // If this is the first time thru after install, 
    // don't resolve() the db.ready() promise until
    // database is populated by server update.
    if (this.dbName === 'ddgExtension' && this.dbVersion === '1') {
    
        // Make 'host' field unique
        const store = this.db.createObjectStore('httpse', { keyPath: 'host' })
    
        // Do a simple check for when objectStore has been created 
        store.transaction.oncomplete = (event) => {
            console.log(`IndexedDBClient: httpse object store oncomplete, call fetchServerUpdate() from server`)
            fetchServerUpdate.apply(this, ['httpse', () => { // success callback
                resolve()
            }])
        }
    } else {
        throw `IndexedDBClient: handleUpgradeNeeded() not yet handling this database and/or database version`
    }
}

function fetchServerUpdate (type, cb) {
    load.JSONfromExternalFile(
        this.serverUpdateUrls[type], 
        (data) => {
            // LATER: handle other server update types here (ex: trackers)
            if (type === 'httpse' && this.dbVersion === '1') {
                
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
                        cb()
                    }
                })
            }
        }
    )
}

function checkServerUpdateSuccess () {
    console.log('checkServerUpdateSuccess()')
    return new Promise((resolve) => {
        let timer = null
        let timerCount = 0
        let maxTimerCount = 120
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
                if (timerCount > maxTimerCount) window.clearInterval(timer)
            }
        }, intervalMS)
    })
}
