const load = require('./../load.es6')
const Dexie = require('dexie')
const constants = require('../../../data/constants')
const settings = require('./../settings.es6')

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
                let etag = settings.getSetting(`${list.name}-etag`) || ''

                this.getDataXHR(list.url, etag).then((response) => {
                    if (response.xhr) {
                        const newEtag = response.xhr.getResponseHeader('etag') || ''
                        settings.updateSetting(`${list.name}-etag`, newEtag)
                    }

                    this.processData(list, response.data).then(resultData => {
                        if (resultData) {
                            resolve(resultData)
                        } else {
                            // reset etag to force us to get fresh server data in case of an error
                            settings.updateSetting(`${list.name}-etag`, '')
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
            xhrData = JSON.parse(xhrData)
            return this.hasCorrectChecksum(xhrData).then((isValid) => {
                if (isValid) {
                    this.storeInLocalDB(listDetails.name, listDetails.type, xhrData)
                    return Object.assign(listDetails, xhrData)
                }
            })
        } else {
            // No new data, look up old data from DB
            return this.getDataFromLocalDB(listDetails.name).then(storedData => {
                if (!storedData) return

                return this.hasCorrectChecksum(storedData.data).then((isValid) => {
                    if (isValid) {
                        if (storedData && storedData.data) {
                            return Object.assign(listDetails, storedData.data)
                        }
                    }
                })
            })
        }
    }

    getDataXHR (url, etag) {
        return new Promise((resolve, reject) => {
            load.loadExtensionFile({url: url, etag: etag, returnType: 'json', source: 'external'}, (data, xhr) => {
                resolve({data: data, xhr: xhr})
            })
            // if load fails, resolve and try to load from db instead
            setTimeout(() => resolve({data: '', xhr: ''}), 30000)
        })
    }

    getDataFromLocalDB (name) {
        console.log(`HTTPS: gettin ${name} from db`)
        return this.dbc.open()
            .then(() => this.dbc.table('httpsStorage').get({name: name}))
            .catch((err) => {
                console.log(`Error getting https data: ${err}`)
            })
    }

    storeInLocalDB (name, type, data) {
        console.log(`HTTPS: storing ${name} in db`)
        return this.dbc.httpsStorage.put({name: name, type: type, data: data})
            .catch((err) => console.log(`Error saving https data: ${err}`))
    }

    hasCorrectChecksum (data) {
        // not everything has a checksum
        if (!data.checksum) return Promise.resolve(true)

        return new Promise((resolve, reject) => {
            // need a buffer to send to crypto.subtle
            let buffer = Buffer.from(data.data, 'base64')

            crypto.subtle.digest('SHA-256', buffer).then(arrayBuffer => {
                let sha256 = Buffer.from(arrayBuffer).toString('base64')
                if (data.checksum.sha256 && data.checksum.sha256 === sha256) {
                    resolve(true)
                } else {
                    resolve(false)
                }
            })
        })
    }
}
module.exports = new HTTPSStorage()
