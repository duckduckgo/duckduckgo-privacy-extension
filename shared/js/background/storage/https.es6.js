const load = require('./../load.es6')
const Dexie = require('dexie')
const constants = require('../../../data/constants')

class HTTPSStorage {
    constructor () {
        this.dbc = new Dexie('https')
        this.dbc.version(1).stores({
            httpsStorage: 'name,type,data,checksum'
        })
    }

    // Load https data defined in constants.httpsLists.
    // First try to grab new data via xhr. If that fails
    // fall back to local db. 
    getLists () {
        return Promise.all(constants.httpsLists.map(list => {
            return new Promise((resolve, reject) => {
                
                this.getDataXHR(list.url).then(data => {
                    if (data) {
                        // if we have new data store it in local DB for later
                        this.storeInLocalDB(list.name, list.type, data)
                        list.data = data
                        resolve(list)
                    } else {
                        // No new data, look up old data from DB
                        this.getDataFromLocalDB(list.name).then(storedData => {
                            if (storedData.data) {
                                list.data = storedData.data
                                resolve(list)
                            } else {
                                reject(new Error(`HTTPS: no stored data for ${list.name}`))
                            }
                        })
                    }
                })
            })
        }))
    }

    getDataXHR (url) {
        return new Promise((resolve, reject) => {
            load.JSONfromExternalFile(url, resolve)
            // if load fails, resolve and try to load from db instead
            setTimeout(() => resolve(), 30000)
        })
    }

    getDataFromLocalDB (name) {
        return this.dbc.open()
            .then(() => this.dbc.table('httpsStorage').get({name: name}))
            .catch((err) => console.log(`Error getting https data: ${err}`))
    }

    storeInLocalDB (name, type, data) {
        return this.dbc.httpsStorage.put({name: name, type: type, data: data})
            .catch((err) => console.log(`Error saving https data: ${err}`))
    }
}
module.exports = new HTTPSStorage()
