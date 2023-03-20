import Dexie from 'dexie'
const load = require('./../load')
const constants = require('../../../data/constants')
const settings = require('./../settings')
const browserWrapper = require('./../wrapper')
const extensionConfig = require('./../../../data/bundled/extension-config.json')
const etags = require('../../../data/etags.json')

const configNames = constants.tdsLists.map(({ name }) => name)

/**
 * @typedef {Object} TDSList
 * @property {string} name
 * @property {string} source
 * @property {string} url
 * @property {Record<string,string>} [channels]
 */

class TDSStorage {
    constructor () {
        this.dbc = new Dexie('tdsStorage')
        this.dbc.version(1).stores({
            tdsStorage: 'name,data'
        })
        this.table = this.dbc.table('tdsStorage')

        this.tds = { entities: {}, trackers: {}, domains: {}, cnames: {} }
        this.surrogates = ''
        this.config = { features: {} }

        this.isInstalling = false

        this._onUpdatedListeners = new Map()

        this._onReadyResolvers = new Map()
        this._onReadyPromises = new Map()
        for (const configName of configNames) {
            this._onReadyPromises.set(
                configName,
                new Promise(
                    resolve => {
                        this._onReadyResolvers.set(configName, resolve)
                    }
                )
            )
        }

        // Update the lists every half an hour.
        this.updatePeriodInMinutes = 30

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

    _internalOnListUpdate (configName, configValue) {
        return new Promise((resolve, reject) => {
            self.setTimeout(async () => {
                // Ensure the onReady promise for this configuration is resolved.
                try {
                    const readyResolve = this._onReadyResolvers.get(configName)
                    if (readyResolve) {
                        readyResolve()
                        this._onReadyResolvers.delete(configName)
                    }

                    // Check the current etag for this configuration, so that can be
                    // passed to the listeners.
                    const etag = settings.getSetting(`${configName}-etag`) || ''

                    // Notify any listeners that this list has updated.
                    const listeners = this._onUpdatedListeners.get(configName)
                    if (listeners) {
                        for (const listener of listeners.slice()) {
                            await listener(configName, etag, configValue)
                        }
                    }
                    resolve(null)
                } catch (e) {
                    reject(e)
                }
            }, 0)
        })
    }

    getLists (preferLocal = false) {
        return Promise.all(constants.tdsLists.map(
            async list => {
                // Skip fetching the lists on extension startup if a new enough
                // local copy exists.
                if (preferLocal) {
                    const lastUpdate = settings.getSetting(`${list.name}-lastUpdate`) || 0
                    const millisecondsSinceUpdate = Date.now() - lastUpdate
                    if (millisecondsSinceUpdate < this.updatePeriodInMinutes * 60 * 1000) {
                        const localList = await this.getListFromLocalDB(list.name)
                        if (localList) {
                            return localList
                        }
                    }
                }

                return await this.getList(list)
            }
        ))
    }

    /**
     * @param {TDSList} list
     */
    async getList (list) {
        // If initOnInstall was called, await the updating from the local bundles before fetching
        if (this.isInstalling) {
            await this._installingPromise
        }
        /** @type {TDSList} */
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

        // @ts-ignore
        if (experiment && experiment.listName === listCopy.name) {
            // @ts-ignore
            listCopy.url = experiment.url
        }

        if (version && listCopy.source === 'external') {
            listCopy.url += version
        }

        const source = listCopy.source ? listCopy.source : 'external'

        return this.getDataXHR(listCopy, etag, source).then(response => {
            // Set the lastUpdate time.
            // Notes:
            //  - Take the earliest time between server and local, that way if
            //    the local time is set far in the future updates will still
            //    happen.
            //  - Date.parse() returns NaN for invalid (or missing) Date
            //    headers, and Math.min() always considers NaN to be the
            //    smallest value. So before calling Math.min(), replace
            //    serverTime with localTime if serverTime is falsey (NaN).
            const localTime = Date.now()
            const serverTime = Date.parse(response.date)
            const updateTime = Math.min(localTime, serverTime || localTime)
            settings.updateSetting(`${listCopy.name}-lastUpdate`, updateTime)

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

                    this._internalOnListUpdate(listCopy.name, resultData)

                    return { name: listCopy.name, data: resultData }
                } else {
                    throw new Error('TDS: process list xhr failed')
                }
            })
        }).catch(async e => {
            const result = await this.getListFromLocalDB(listCopy.name)
            if (result) {
                return result
            }

            // Reset the etag and lastUpdate time to force us to get
            // fresh server data in case of an error.
            settings.updateSetting(`${listCopy.name}-etag`, '')
            settings.updateSetting(`${listCopy.name}-lastUpdate`, '')
            throw new Error('TDS: data update failed')
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

    getDataXHR (list, etag, source) {
        return load.loadExtensionFile({ url: list.url, etag, returnType: list.format, source, timeout: 60000 })
    }

    async getListFromLocalDB (name) {
        console.log('TDS: getting from db', name)
        try {
            await this.dbc.open()
            const list = await this.dbc.table('tdsStorage').get({ name })

            if (list && list.data) {
                this[name] = list.data
                this._internalOnListUpdate(name, list.data)
                return { name, data: list.data }
            }
        } catch (e) {
            console.warn(`getListFromLocalDB failed for ${name}`, e)
            return null
        }
    }

    storeInLocalDB (name, data) {
        return this.table.put({ name, data }).catch(e => {
            console.warn(`storeInLocalDB failed for ${name}: resetting stored etag`, e)
            settings.updateSetting(`${name}-etag`, '')
            settings.updateSetting(`${name}-lastUpdate`, '')
        })
    }

    parsedata (name, data) {
        const parsers = {
            brokenSiteList: dataIn => {
                return dataIn.trim().split('\n')
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
            // @ts-ignore
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
        this.table.delete('ReferrerExcludeList')
        this.table.delete('brokenSiteList')
        this.table.delete('protections')
    }

    onUpdate (name, listener) {
        let listeners = this._onUpdatedListeners.get(name)
        if (!listeners) {
            listeners = []
            this._onUpdatedListeners.set(name, listeners)
        }
        listeners.push(listener)
    }

    ready (configName) {
        if (!configName) {
            return Promise.all(this._onReadyPromises.values())
        }

        const readyPromise = this._onReadyPromises.get(configName)
        if (!readyPromise) {
            throw new Error(`Unknown configuration: ${configName}`)
        }
        return readyPromise
    }
}
export default new TDSStorage()
