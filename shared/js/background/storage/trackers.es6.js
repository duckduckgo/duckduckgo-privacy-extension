const Storage = require('./storage.es6')

class TrackersStorage {
    constructor (ops) {
        this.storage = new Storage(ops)
    }

    getLists (lists) {
        return this.storage.getLists(lists)
    }
}
module.exports = new TrackersStorage({dbName: 'trackers', tableName: 'trackersStorage'})
