const load = require('./../load.es6')
const Dexie = require('dexie')
const constants = require('../../../data/constants')
const settings = require('./../settings.es6')
const browserWrapper = require('./../$BROWSER-wrapper.es6')

class TDSStorage {
    constructor () {
        this.dbc = new Dexie('tdsStorage')
        this.dbc.version(1).stores({
            tdsStorage: 'name,data'
        })
        this.tds = {entities: {}, trackers: {}, domains: {}}
        this.surrogates = ''
        this.brokenSiteList = []
    }

    getLists () {
        return Promise.all(constants.tdsLists.map(list => {
            const listCopy = JSON.parse(JSON.stringify(list))
            const etag = settings.getSetting(`${listCopy.name}-etag`) || ''
            const version = this.getVersionParam()
            const activeExperiment = settings.getSetting('activeExperiment')

            let experiment = ''
            if (activeExperiment) {
                experiment = settings.getSetting('experimentData')
            }

            if (experiment && experiment.listName === listCopy.name) {
                listCopy.url = experiment.url
            }

            if (version && listCopy.source === 'external') {
                listCopy.url += version
            }

            const source = listCopy.source ? listCopy.source : 'external'

            return this.getDataXHR(listCopy, etag, source).then(response => {
                // for 200 response we update etags
                if (response && response.status === 200) {
                    const newEtag = response.getResponseHeader('etag') || ''
                    settings.updateSetting(`${listCopy.name}-etag`, newEtag)
                }

                // We try to process both 200 and 304 responses. 200s will validate
                // and update the db. 304s will try to grab the previous data from db
                // or throw an error if none exists.
                return this.processData(listCopy.name, response.data).then(resultData => {
                    if (resultData) {
                        // store tds in memory so we can access it later if needed
                        this[listCopy.name] = resultData
                        return {name: listCopy.name, data: resultData}
                    } else {
                        throw new Error(`TDS: process list xhr failed`)
                    }
                })
            }).catch(e => {
                return this.fallbackToDB(listCopy.name).then(backupFromDB => {
                    if (backupFromDB) {
                        // store tds in memory so we can access it later if needed
                        this[listCopy.name] = backupFromDB
                        return {name: listCopy.name, data: backupFromDB}
                    } else {
                        // reset etag to force us to get fresh server data in case of an error
                        settings.updateSetting(`${listCopy.name}-etag`, '')
                        throw new Error(`TDS: data update failed`)
                    }
                })
            })
        }))
    }

    processData (name, xhrData) {
        if (xhrData) {
            const parsedData = this.parsedata(name, xhrData)
            this.storeInLocalDB(name, parsedData)
            return Promise.resolve(parsedData)
        } else {
            return Promise.resolve()
        }
    }

    fallbackToDB (name) {
        return this.getDataFromLocalDB(name).then(storedData => {
            if (!storedData) return

            if (storedData && storedData.data) {
                return storedData.data
            }
        })
    }

    getDataXHR (list, etag, source) {
        return load.loadExtensionFile({url: list.url, etag: etag, returnType: list.format, source, timeout: 60000})
    }

    getDataFromLocalDB (name) {
        console.log('TDS: getting from db')
        return this.dbc.open()
            .then(() => this.dbc.table('tdsStorage').get({name: name}))
    }

    storeInLocalDB (name, data) {
        return this.dbc.tdsStorage.put({name: name, data: data})
    }

    parsedata (name, data) {
        const parsers = {
            'brokenSiteList': data => {
                return data.split('\n')
            }
        }

        if (parsers[name]) {
            return parsers[name](data)
        } else {
            return data
        }
    }

    // add version param to url on the first install and only once a day after that
    getVersionParam () {
        const ONEDAY = 1000 * 60 * 60 * 24
        const version = browserWrapper.getExtensionVersion()
        const lastTdsUpdate = settings.getSetting('lastTdsUpdate')
        const now = Date.now()
        let versionParam

        // check delta for last update
        if (lastTdsUpdate) {
            const delta = now - new Date(lastTdsUpdate)

            if (delta > ONEDAY) {
                versionParam = `&v=${version}`
            }
        } else {
            versionParam = `&v=${version}`
        }

        if (versionParam) settings.updateSetting('lastTdsUpdate', now)

        return versionParam
    }
}
module.exports = new TDSStorage()
