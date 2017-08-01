// TODO: this is awkward here. move it somewhere else.
const updateTypes =  {
    https: 'http://jason.duckduckgo.com/collect.js?type=httpse'
}

/**
 * Public api
 * Usage:
 *
 * const db = new IndexedDBClient(ops)
 * db.ready().then(function () {
 *    const mr_wiggles = db.get('cats', 'mr_wiggles')
 * })
 *
 * NOTE:
 * db.ready() won't fire until db is populated after extension install.
 * after that, db.ready() fires as soon as db connection is ready!
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
        if (!this.db) {
            console.warn('IndexedDBClient: this.db does not exist')
            return
        }
        console.log('add() record to objectStore: ', record)
        const _objectStore = this.db.transaction(objectStore, 'readwrite').objectStore(objectStore)
        _objectStore.add(record)
    }

    get (objectStore, record) {

    }
}

// Private
function connect () {
    console.log('connect()')
    return new Promise((resolve, reject) => {
        // note: we aren't dealing with vendor prefixed versions
        // only stable implementations of indexedDB
        if (!window.indexedDB) reject()

        // make db request
        let request = window.indexedDB.open(this.dbName, this.dbVersion)
        request.onerror = (event) => {
          console.log('IndexedDB error: ' + event.target.errorCode)
          reject()
        }
        request.onupgradeneeded = (event) => {
            console.log('IndexedDB: onupgradeneeded to version ' + this.dbVersion)
            this.db = event.target.result
            handleUpgradeNeeded.apply(this, [resolve, reject])
        }
        request.onsuccess = (event) => {
            console.log('IndexedDB: onsuccess')
            this.db = event.target.result
            db.onerror = function(event2) {
                console.log('IndexedDB error: ' + event2.target.errorCode)
            }
            resolve()
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
        // make 'host' field unique
        let objectStore = this.db.createObjectStore('https', { keyPath: 'host' })
        // create index on 'simpleUpgrade' field
        objectStore.createIndex('simpleUpgrade', 'simpleUpgrade', { unique: false })
        // do a simple check to confirm init is complete
        objectStore.transaction.oncomplete = (event) => {
            console.log('IndexedDB objectStore oncomplete, call fetchUpdate')
            // now fetch data from server
            fetchUpdate.call(this, 'https', (data) => {
                console.log('fetch update callback fired, data: ', data)
                handleUpdate.call(this, data, () => {
                    resolve()
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
    //load.JSONPfromExternalFile(updateTypes[type], (data) => cb(data))
    // TODO: replace fake data with real data from xhr above:
    const fakeParsedData = {
        upgrade: ['foo.com', 'bar.org', 'baz.net']
    }
    cb(fakeParsedData)
}

function handleUpdate (data, cb) {
    // TODO: maybe set a timestamp too
    console.log('handleUpdate(data)', data)
    if (data && data.upgrade && data.upgrade.length > 0) {
        data.upgrade.forEach((host, index) => {
            // insert record into IndexedDB
            this.add('https', {
                'host': host,
                'simpleUpgrade': true,
                'rule': '',
                'lastUpdated': new Date().toString()
            })
            if (index === (data.upgrade.length - 1)) cb()
        })
    }
}
