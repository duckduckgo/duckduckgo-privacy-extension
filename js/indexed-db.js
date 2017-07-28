/**
 * Public api
 * Usage:
 *
 * const db = new IndexedDBClient(ops)
 * db.ready().then(function () {
 *    db.get('cats', 'mr_wiggles')
 * })
 *
 */
class IndexedDBClient {

    constructor (ops) {
        this.clientVersion = '1'
        this.ops = ops || {}
        this.dbName = ops.dbName
        this.dbDesc = ops.dbDesc || ''
        this.db = connect.bind(this)
        return this
    }

    // sugar for this.db connect() promise
    ready () {
        return this.db
    }

    fetchUpdate (type) {
        return new Promise((resolve, reject) => {
            // LATER in Phase 3: do this daily
            // send xhr request
            // process xhr response in handleUpdate()
            handleUpdate.bind(this)
        })
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
    return new Promise((resolve, reject) => {
        // return db connection
    })
}

function handleUpdate (data) {
    // try/catch data in case there's a parsing issue
    // set new db version based on git sha of response
    // maybe a timestamp too
}

const updateEndpointsByType {
    https: 'https://collect.duckduckgo.com/foo/bar.txt'
    // LATER: `trackers`
}
