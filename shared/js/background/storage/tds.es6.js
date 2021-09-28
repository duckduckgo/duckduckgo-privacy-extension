const load = require('./../load.es6')
const Dexie = require('dexie')
const constants = require('../../../data/constants')
const settings = require('./../settings.es6')
const browserWrapper = require('./../wrapper.es6')
const extensionConfig = require('./../../../privacy-configuration/generated/extension-config.json')
const etags = require('../../../data/etags.json')

class TDSStorage {
    constructor () {
        this.dbc = new Dexie('tdsStorage')
        this.dbc.version(1).stores({
            tdsStorage: 'name,data'
        })
        this.tds = { entities: {}, trackers: {}, domains: {}, cnames: {} }
        this.surrogates = ''
        this.ClickToLoadConfig = {}
        this.config = {}
        this.isInstalling = false

        this.removeLegacyLists()
    }

    async initOnInstall () {
        this.isInstalling = true
        this._installingPromise = await this._internalInitOnInstall()
        this.isInstalling = false
    }

    async _internalInitOnInstall () {
        await settings.ready()
        const etagKey = 'config-etag'
        const etagValue = settings.getSetting(etagKey)
        // If there's an existing value ignore the bundled values
        if (!etagValue) {
            settings.updateSetting(etagKey, etags[etagKey])
            this.config = extensionConfig
            await this.storeInLocalDB('config', extensionConfig)
        }
    }

    getLists () {
        return Promise.all(constants.tdsLists.map(list => this.getList(list)))
    }

    async getList (list) {
        // If initOnInstall was called, await the updating from the local bundles before fetching
        if (this.installing) {
            await this._installingPromise
        }
        const listCopy = JSON.parse(JSON.stringify(list))
        const etag = settings.getSetting(`${listCopy.name}-etag`) || ''
        const version = this.getVersionParam()
        const activeExperiment = settings.getSetting('activeExperiment')
        const channel = settings.getSetting(`${listCopy.name}-channel`) || ''

        let experiment = ''
        if (activeExperiment) {
            experiment = settings.getSetting('experimentData')
        }

        // select custom version of the list from the config
        if (channel && listCopy.channels && listCopy.channels[channel]) {
            listCopy.url = listCopy.channels[channel]
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
                const newEtag = response.etag || ''
                settings.updateSetting(`${listCopy.name}-etag`, newEtag)
            }

            // We try to process both 200 and 304 responses. 200s will validate
            // and update the db. 304s will try to grab the previous data from db
            // or throw an error if none exists.
            return this.processData(listCopy.name, response.data).then(resultData => {
                if (resultData) {
                    // store tds in memory so we can access it later if needed
                    this[listCopy.name] = resultData
                    return { name: listCopy.name, data: resultData }
                } else {
                    throw new Error('TDS: process list xhr failed')
                }
            })
        }).catch(e => {
            return this.fallbackToDB(listCopy.name).then(backupFromDB => {
                if (backupFromDB) {
                    // store tds in memory so we can access it later if needed
                    this[listCopy.name] = backupFromDB
                    return { name: listCopy.name, data: backupFromDB }
                } else {
                    // reset etag to force us to get fresh server data in case of an error
                    settings.updateSetting(`${listCopy.name}-etag`, '')
                    throw new Error('TDS: data update failed')
                }
            })
        })
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
        return load.loadExtensionFile({ url: list.url, etag: etag, returnType: list.format, source, timeout: 60000 })
    }

    getDataFromLocalDB (name) {
        console.log('TDS: getting from db')
        return this.dbc.open()
            .then(() => this.dbc.table('tdsStorage').get({ name: name }))
    }

    storeInLocalDB (name, data) {
        return this.dbc.tdsStorage.put({ name: name, data: data })
    }

    parsedata (name, data) {
        const parsers = {
            brokenSiteList: data => {
                return data.trim().split('\n')
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

    /**
     * Convert the given list into stringified form.
     * @param {*} name
     * @returns list in a fully serialisable format
     */
    getSerializableList (name) {
        if (name === 'tds') {
            // copy and convert regexes to string
            const listCopy = JSON.parse(JSON.stringify(this.tds))
            Object.values(listCopy.trackers).forEach((tracker) => {
                tracker.rules?.forEach((rule, i) => {
                    // convert Regex to string and cut slashes and flags
                    const ruleRegexStr = this.tds.trackers[tracker.domain].rules[i].rule.toString()
                    rule.rule = ruleRegexStr.slice(1, ruleRegexStr.length - 3)
                })
            })
            return listCopy
        } else {
            return this[name]
        }
    }

    removeLegacyLists () {
        this.dbc.tdsStorage.delete('ReferrerExcludeList')
        this.dbc.tdsStorage.delete('brokenSiteList')
        this.dbc.tdsStorage.delete('protections')
    }
}
module.exports = new TDSStorage()
