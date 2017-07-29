/**
 * Public api
 * Usage:
 *
 * const db = new IndexedDBClient(ops)
 * db.ready().then(function () {
 *    const mr_wiggles = db.get('cats', 'mr_wiggles')
 * })
 *
 */
class IndexedDBClient {

    constructor (ops) {
        this.clientVersion = '1'
        ops = ops || {}
        this.dbName = ops.dbName || 'ddg'
        this.dbVersion = ops.dbVersion
        this.db = null
        this._ready = connect.call(this)
        return this
    }

    // sugar for this.db connect() promise
    ready () {
        return this._ready
    }

    fetchUpdate (type) {
      return fetchUpdate (type)
    }

    getUpdateTypes () {
      return Object.keys(updateEndpointsByType)
    }

    add (objectStore, key) {

    }

    get (objectStore, key) {

    }

    delete (objectStore, key) {

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
            console.log('IndexedDB onupgradeneeded to version ' + this.dbVersion)
            this.db = event.target.result
            initDatabase.call(this)
        }
        request.onsuccess = (event) => {
            console.log('IndexedDB onsuccess')
            this.db = event.target.result
            db.onerror = function(event2) {
                console.log('IndexedDB error: ' + event2.target.errorCode)
            }
            resolve()
        }
    })
}

// TODO: abstract this into an https module of its own, separate from db client
// this is more about handling db migrations, is specific to https for now
function initDatabase () {
    console.log('initDatabase()')
    if (this.dbName === 'ddg' && this.dbVersion === '1') {
        // make 'host' field unique
        let objectStore = db.createObjectStore('https', { keyPath: 'host' })
        // create index on 'simpleUpgrade' field
        objectStore.createIndex('simpleUpgrade', 'simpleUpgrade', { unique: false })

        // just do a simple check to confirm for now
        objectStore.transaction.oncomplete = function (event) {
            console.log('IndexedDB init: yassss kween')
        }
        // TODO: now fetch data from server
        // fetchUpdate.call(this, 'https').then((rawFetchedData) => {
        //     handleUpdate.call(this, rawFetchedData)
        // })
    }
}

function fetchUpdate (type) {
    return new Promise((resolve, reject) => {
        // LATER in Phase 3: do this daily
        // send xhr request
        // process xhr response in handleUpdate()
    })
}

function handleUpdate (data) {
    // try/catch data in case there's a parsing issue
    // set new db version based on git sha of response
    // maybe a timestamp too
}

// TODO: abstract me out into https module
const updateEndpointsByType = {
    https: 'http://jason.duckduckgo.com/collect.js?type=httpse&callback=cb'
    // LATER: `trackers`
}
