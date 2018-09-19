const load = require('./../load.es6')
const Dexie = require('dexie')
const constants = require('../../../data/constants')
const settings = require('./../settings.es6')

class Storage {
    constructor (ops) {
        this.dbc = new Dexie(ops.dbName)
        this.tableName = ops.tableName
        this.version = ops.version || 1
        const dataType = {}
        dataType[ops.tableName] = 'name,type,data,checksum'
        this.dbc.version(1).stores(dataType)
        this.validateChecksum = ops.validateChecksum || ''
    }

    getLists (lists) {
        return Promise.all(lists.map(list => {
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
                        throw new Error(`Storage: process list xhr failed  ${listCopy.name}`)
                    }
                })
            }).catch(e => {
                return this.fallbackToDB(listCopy).then(backupFromDB => {
                    if (backupFromDB) {
                        return backupFromDB
                    } else {
                        // reset etag to force us to get fresh server data in case of an error
                        settings.updateSetting(`${listCopy.name}-etag`, '')
                        throw new Error(`Storage: data update for ${listCopy.name} failed`)
                    }
                })
            })
        }))
    }

    // validate xhr data and lookup previous data from local db if needed
    // verify the checksum before returning the processData result
    processData (listDetails, xhrData) {
        if (xhrData) {
            return this.hasCorrectChecksum(xhrData, listDetails).then((isValid) => {
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

            return this.hasCorrectChecksum(storedData.data, listDetails).then((isValid) => {
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
        console.log(`Storage: getting ${name} from db`)
        return this.dbc.open()
            .then(() => this.dbc.table(this.tableName).get({name: name}))
    }

    storeInLocalDB (name, type, data) {
        console.log(`Storage: storing ${name} in db`)
        return this.dbc[this.tableName].put({name: name, type: type, data: data})
    }

    // caller can pass data and a function for validating the checksum otherwise just resolve
    hasCorrectChecksum (data, listDetails) {
        if (!(data && this.validateChecksum)) {
            return Promise.resolve(true)
        } else {
            return Promise.resolve(this.validateChecksum(data, listDetails))
        }
    }
}

module.exports = Storage
