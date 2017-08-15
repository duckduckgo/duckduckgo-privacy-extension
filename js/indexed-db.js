// TODO: this is awkward here. move it somewhere else.
// run `r collect` locally to fire up service from `jd/https-list` branch
const updateTypes =  {
    https: 'http://lauren.duckduckgo.com/collect.js?type=httpse'
}

/**
 * Public api
 * Usage:
 *
 * const db = new IndexedDBClient(ops)
 * db.ready().then(() => {
 *    db.get('cats', 'mr_wiggles')
 *        .then(
 *            (record) => console.log(record), // success
 *            (event) => console.log(event) // failure
 *        )
 * })
 *
 * NOTE:
 * db.ready() won't fire until db is populated with fetched data
 * after extension install.
 * After that, db.ready() fires as soon as db connection is ready!
 *
 */
class IndexedDBClient {

    constructor (ops) {
        this.clientVersion = '1'
        ops = ops || {}
        this.dbName = ops.dbName
        this.dbVersion = ops.dbVersion // no floats (decimals) in version #
        this.db = null
        this._ready = connect.call(this)
        return this
    }

    // sugar for this.db connect() promise
    ready () {
        return this._ready
    }

    add (objectStore, record) {
        // console.log('add() record to objectStore: ', record)
        if (!this.db) {
            console.warn('IndexedDBClient: this.db does not exist')
            return
        }
        const _objectStore = this.db.transaction(objectStore, 'readwrite').objectStore(objectStore)
        _objectStore.add(record)
    }

    get (objectStore, record) {
        // console.log('get() record from objectStore: ', record)
        return new Promise((resolve, reject) => {
            if (!this.db) {
                console.warn('IndexedDBClient: this.db does not exist')
                reject()
            }

            const _objectStore = this.db.transaction(objectStore).objectStore(objectStore)
            const _request = _objectStore.get(record)
            _request.onerror = (event) => reject(event)
            _request.onsuccess = (event) => resolve(_request.result)
        })
    }

    update (objectStore, record) {
        throw 'IndexedDB: update() not yet implemented'
    }

    /* For debugging/development purposes only */
    deleteDB () {
        console.warn('WARNING: Avoid using .deleteDB() in production! Attempting to delete database: ' + this.dbName)
        window.indexedDB.deleteDatabase(this.dbName)
    }

}

// Private
function connect () {
    console.log('connect()')
    return new Promise((resolve, reject) => {
        // NOTE: we aren't dealing with vendor prefixed versions
        // only stable implementations of indexedDB
        if (!window.indexedDB) reject()

        // Make db request
        let request = window.indexedDB.open(this.dbName, this.dbVersion)

        request.onupgradeneeded = (event) => {
            console.log('IndexedDB: onupgradeneeded to version ' + this.dbVersion)
            this.db = event.target.result
            handleUpgradeNeeded.apply(this, [resolve, reject])
        }
        request.onerror = (event) => {
          console.log('IndexedDB error: ' + event.target.errorCode)
          reject()
        }
        request.onsuccess = (event) => {
            console.log('IndexedDB: onsuccess')
            this.db = event.target.result
            db.onerror = function(event2) {
                console.log('IndexedDB error: ' + event2.target.errorCode)
            }
            resolve()

            // DEBUG/TEST
            /*
            const _objectStore = this.db.transaction('https').objectStore('https');
            _objectStore.openCursor().onsuccess = function (event3) {
              const cursor = event3.target.result
              if (cursor) {
                console.log('IndexedDB cursor.key: ' + cursor.key)
                cursor.continue()
              }
              else {
                console.log('IndexedDB cursor: No more entries!')
              }
            }

            // TODO this should probably be in a test:
            this.get('https', '1337x.to')
                .then((r) => console.log(r),
                      (e) => console.log(e))

            this.get('https', 'submit.pandora.com')
                .then((r) => console.log(r),
                      (e) => console.log(e))

            this.get('https', '*.api.roblox.com')
                .then((r) => console.log(r),
                      (e) => console.log(e))

            this.get('https', 'thump.vice.com')
                .then((r) => console.log(r),
                      (e) => console.log(e))

            this.get('https', 'yts.ag')
                .then((r) => console.log(r),
                      (e) => console.log(e))
             */

        }
    })
}

// Handles db init + migrations
function handleUpgradeNeeded (resolve, reject) {
    console.log('handleUpgradeNeeded()')
    // If this is the first time thru, don't resolve() db.ready promise until
    // database is populated by server call. Later we can use this promise
    // to build "loading" ui
    if (this.dbName === 'ddgExtension' && this.dbVersion === '1') {

        // Make 'host' field unique
        let objectStore = this.db.createObjectStore('https', { keyPath: 'host' })

        // Create index on 'simpleUpgrade' field
        objectStore.createIndex('simpleUpgrade', 'simpleUpgrade', { unique: false })

        // Do a simple check for when objectStore.createIndex is complete
        objectStore.transaction.oncomplete = (event) => {
            console.log('IndexedDB: `https` object store oncomplete, call fetchUpdate() from server')

            // Now fetch data from server
            fetchUpdate.call(this, 'https', (data) => {
                console.log('fetch update callback fired, data: ', data)
                handleUpdate.call(this, data, () => {
                    resolve() // resolve db.ready() promise
                })
            })
        }
    } else if (this.dbName === 'ddgExtension') {
        // beyond dbVersion=1, we can use previous ruleset already in db
        // and fetch updated server data in the background
        resolve()
    }
}

function fetchUpdate (type, cb) {
    load.JSONfromExternalFile(updateTypes[type], (data) => cb(data))
}

function handleUpdate (data, cb) {
    console.log('handleUpdate(data)', data)
    if (!(data && data.simpleUpgrade && data.simpleUpgrade.length)) return

    // Insert each record into client's IndexedDB
    let counter = 1;
    data.simpleUpgrade.forEach((host, index) => {

        let record = {
            host: host,
            simpleUpgrade: true,
            lastUpdated: new Date().toString()
        }

        // Add record to db
        this.add('https', record)
        // console.log('IndexedDB: Added record to object store: `https`. Record count: ' + counter)
        counter++;

        if (index === (data.simpleUpgrade.length - 1)) {
            console.log('IndexedDB: ' + data.simpleUpgrade.length + ' records added to `https` object store')
            cb()
        }
    })
}
