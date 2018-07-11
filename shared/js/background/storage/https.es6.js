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
                    this.processData(list, data).then(resultData => {
                        if (resultData) {
                            resolve(resultData)
                        } else {
                            reject(new Error(`HTTPS: data update for ${list.name} failed`))
                        }
                    })
                })
            })
        }))
    }

    // validate xhr data and lookup previous data from local db if needed
    // verify the checksum before returning the processData result
    processData (listDetails, xhrData) {
        if (xhrData) {
            return this.hasCorrectChecksum(xhrData.data, xhrData.checksum).then((isValid) => {
                if (isValid) {
                    this.storeInLocalDB(listDetails.name, listDetails.type, xhrData)
                    return Object.assign(listDetails, xhrData)
                }
            })
        } else {
            // No new data, look up old data from DB
            return this.getDataFromLocalDB(list.name).then(storedData => {
                hasCorrectChecksum(storedData.data, storedData.checksum).then((isValid) => {
                    if (isValid) {
                        if (storedData && storedData.data) {
                            resultData.data = storedData.data
                            return resultData
                        }
                    }
                })
            })
        }
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

    hasCorrectChecksum (data, checksum) {
        // not everything has a checksum
        if (!checksum) return Promise.resolve(true)

        return new Promise((resolve, reject) => {
            // need a buffer to send to crypto.subtle
            let buffer = Buffer.from(data, 'base64')

            crypto.subtle.digest('SHA-256', buffer).then(arrayBuffer => {
                let sha256 = Buffer.from(arrayBuffer).toString('base64')
                if (checksum.sha256 && checksum.sha256 === sha256) {
                    resolve(true)
                } else {
                    resolve(false)
                }
            })
        })
    }
}
module.exports = new HTTPSStorage()
