const load = require('./../load.es6')
const Dexie = require('dexie')
const constants = require('../../../data/constants')
const settings = require('./../settings.es6')

class HTTPSStorage {
    constructor () {
        this.dbc = new Dexie(constants.httpsDBName)
        this.dbc.version(1).stores({
            httpsStorage: 'name,type,data,checksum'
        })
    }

    // Load https data defined in constants.httpsLists.
    // We wait until all promises resolve to send datd to https.
    // This is all or nothing. We gather data for each of the lists
    // and validate. If any list fails validation then promise.all will
    // reject the whole update.
    getLists () {
        return Promise.all(constants.httpsLists.map(list => {
            let listCopy = JSON.parse(JSON.stringify(list))
            let etag = settings.getSetting(`${listCopy.name}-etag`) || ''

            return this.getDataXHR(listCopy.url, etag).then(response => {
                // for 200 response we update etags
                if (response && response.status === 200) {
                    const newEtag = response.getResponseHeader('etag') || ''
                    settings.updateSetting(`${listCopy.name}-etag`, newEtag)
                }

                // We try to process both 200 and 304 responses. 200s will validate
                // and update the db. 304s will try to grab the previous data from db
                // or throw an error if none exists.
                return this.processData(listCopy, response.data).then(resultData => {
                    if (resultData) {
                        return resultData
                    } else {
                        throw new Error(`HTTPS: process list xhr failed  ${listCopy.name}`)
                    }
                })
            }).catch(e => {
                return this.fallbackToDB(listCopy).then(backupFromDB => {
                    if (backupFromDB) {
                        return backupFromDB
                    } else {
                        // reset etag to force us to get fresh server data in case of an error
                        settings.updateSetting(`${listCopy.name}-etag`, '')
                        throw new Error(`HTTPS: data update for ${listCopy.name} failed`)
                    }
                })
            })
        }))
    }

    // validate xhr data and lookup previous data from local db if needed
    // verify the checksum before returning the processData result
    processData (listDetails, xhrData) {
        if (xhrData) {
            return this.hasCorrectChecksum(xhrData).then((isValid) => {
                if (isValid) {
                    this.storeInLocalDB(listDetails.name, listDetails.type, xhrData)
                    return Object.assign(listDetails, xhrData)
                }
            })
        } else {
            return Promise.resolve()
        }
    }

    fallbackToDB (listDetails) {
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

    getDataXHR (url, etag) {
        return load.loadExtensionFile({url: url, etag: etag, returnType: 'json', source: 'external', timeout: 60000})
    }

    getDataFromLocalDB (name) {
        console.log(`HTTPS: getting ${name} from db`)
        return this.dbc.open()
            .then(() => this.dbc.table('httpsStorage').get({name: name}))
    }

    storeInLocalDB (name, type, data) {
        console.log(`HTTPS: storing ${name} in db`)
        return this.dbc.httpsStorage.put({name: name, type: type, data: data})
    }

    hasCorrectChecksum (data) {
        // not everything has a checksum
        if (!data.checksum) return Promise.resolve(true)

        // need a buffer to send to crypto.subtle
        let buffer = Buffer.from(data.data, 'base64')

        return crypto.subtle.digest('SHA-256', buffer).then(arrayBuffer => {
            let sha256 = Buffer.from(arrayBuffer).toString('base64')
            if (data.checksum.sha256 && data.checksum.sha256 === sha256) {
                return true
            } else {
                return false
            }
        })
    }
}
module.exports = new HTTPSStorage()
