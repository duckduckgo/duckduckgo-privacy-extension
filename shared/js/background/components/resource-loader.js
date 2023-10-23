import Dexie from 'dexie'
import bundledEtags from '../../../data/etags.json'
import { alarms } from 'webextension-polyfill'
/**
 * @typedef {'tds' | 'surrogates' | 'config'} ResourceName
 *
 * @typedef {object} ResourceConfig
 * @property {ResourceName} name
 * @property {string} [remoteUrl]
 * @property {string} [localUrl]
 * @property {number} [updateIntervalMinutes]
 * @property {'json'|'text'} [format]
 *
 * @typedef {(resourceName: ResourceName, etag: string, value: any) => void} OnUpdatedCallback
 * @typedef {import('../settings.js')} Settings
 */

export default class ResourceLoader {
    /** @type {Dexie?} */
    static dbc = null

    /**
     * @param {ResourceConfig} config
     * @param {{
     *  settings: Settings
     * }} opts
     */
    constructor (config, { settings }) {
        this.settings = settings
        this.name = config.name
        this.remoteUrl = config.remoteUrl
        this.localUrl = config.localUrl
        this.updateIntervalMinutes = config.updateIntervalMinutes || 0
        this.format = config.format || 'json'
        this.data = null
        /** @type {OnUpdatedCallback[]} */
        this._onUpdatedListeners = []

        if (!this.remoteUrl && !this.localUrl) {
            throw new Error('invalid config: need a remote or local URL (or both)')
        }

        this.ready = this.checkForUpdates()

        if (this.updateIntervalMinutes) {
            const alarmName = `updateResource: ${this.name}`
            alarms.create(alarmName, { periodInMinutes: this.updateIntervalMinutes })
            alarms.onAlarm.addListener((alarmEvent) => {
                if (alarmEvent.name === alarmName) {
                    this.checkForUpdates()
                }
            })
        }
    }

    get lastUpdate () {
        return this.settings.getSetting(`${this.name}-lastUpdate`) || 0
    }

    set lastUpdate (value) {
        this.settings.updateSetting(`${this.name}-lastUpdate`, value)
    }

    get etag () {
        return this.settings.getSetting(`${this.name}-etag`) || ''
    }

    set etag (value) {
        this.settings.updateSetting(`${this.name}-etag`, value)
    }

    async checkForUpdates (force) {
        await this.settings.ready()
        const loadFromDb = this._loadFromDB.bind(this)
        const loadFromRemote = this._loadFromURL.bind(this, this.remoteUrl)
        const loadFromLocal = this._loadFromURL.bind(this, this.localUrl, true)
        let loadOrder = []
        if (this.remoteUrl && Date.now() - this.lastUpdate < this.updateIntervalMinutes * 1000 * 60 && !force) {
            // load from DB first as it should be fresh
            loadOrder = [
                loadFromDb,
                loadFromRemote
            ]
        } else if (this.remoteUrl) {
            loadOrder = [
                loadFromRemote,
                loadFromDb
            ]
        }
        // The last backup is the local file
        if (this.localUrl) {
            loadOrder.push(loadFromLocal)
        }

        for (const loader of loadOrder) {
            try {
                const result = await loader()
                await this._updateData(result)
                break
            } catch (e) {
                console.warn('Load failed...', e)
                continue
            }
        }
    }

    async _loadFromDB () {
        console.log(`Load ${this.name} from DB`)
        const dbc = await this._getDb()
        const list = await dbc.table('tdsStorage').get({ name: this.name })
        return {
            contents: list.data
        }
    }

    async _loadFromURL (url, local = false) {
        console.log(`Load ${this.name} from url`)
        const request = new Request(url)
        const response = await fetch(request)
        if (!response.ok) {
            throw new Error(response.statusText)
        }
        const contents = await response[this.format]()
        return {
            contents,
            etag: local ? bundledEtags[`${this.name}-etag`] : response.headers.get('etag')
        }
    }

    async _getDb () {
        if (!ResourceLoader.dbc) {
            const dbc = new Dexie('tdsStorage')
            dbc.version(1).stores({
                tdsStorage: 'name,data'
            })
            ResourceLoader.dbc = dbc
            await dbc.open()
        }
        return ResourceLoader.dbc
    }

    /**
     * @param {{
     *  contents: any;
     *  etag?: string;
     * }} result
     */
    async _updateData (result) {
        console.log(`Loaded ${this.name}:`, result)
        const updated = !!(this.data === null || this.etag)
        this.data = result.contents

        if (result.etag) {
            const dbc = await this._getDb()
            await dbc.table('tdsStorage').put({ name: this.name, data: result.contents })
            this.etag = result.etag
            this.lastUpdate = Date.now()
        }
        if (updated) {
            for (const listener of this._onUpdatedListeners.slice()) {
                listener(this.name, this.etag, this.data)
            }
        }
    }

    /**
     * @param {OnUpdatedCallback} cb
     */
    onUpdate (cb) {
        this._onUpdatedListeners.push(cb)
    }

    /**
     * Manually set the value of this resource
     * @param {any} data
     */
    async overrideDataValue (data) {
        // create an etag hash based on the content
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(data)))
        const etag = [...new Uint8Array(hash)]
            .map(x => x.toString(16).padStart(2, '0'))
            .join('')
        await this._updateData({
            contents: data,
            etag
        })
    }

    /**
     * Modify resource data in-place
     * @param {(data: any) => any} func
     */
    async modify (func) {
        await this.ready
        const newValue = func(this.data)
        await this.overrideDataValue(newValue)
    }
}
