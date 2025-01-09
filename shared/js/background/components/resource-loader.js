import Dexie from 'dexie';
import { alarms } from 'webextension-polyfill';
import bundledEtags from '../../../data/etags.json';
import { createAlarm } from '../wrapper';
/**
 * @typedef {'tds' | 'surrogates' | 'config'} ResourceName
 *
 * @typedef {object} ResourceConfig
 * @property {ResourceName} name
 * @property {string | (() => Promise<string>)} [remoteUrl]
 * @property {string} [localUrl]
 * @property {number} [updateIntervalMinutes]
 * @property {'json'|'text'} [format]
 *
 * @typedef {(resourceName: ResourceName, etag: string, value: any) => Promise<any> | void} OnUpdatedCallback
 * @typedef {import('../settings.js')} Settings
 */

const AFTER_UPDATE_EVENT_NAME = 'afterUpdate';

export default class ResourceLoader extends EventTarget {
    /** @type {Dexie?} */
    static dbc = null;

    /**
     * @param {ResourceConfig} config
     * @param {{
     *  settings: Settings
     * }} opts
     */
    constructor(config, { settings }) {
        super();
        this.settings = settings;
        this.name = config.name;
        this.remoteUrl = config.remoteUrl;
        this.localUrl = config.localUrl;
        this.updateIntervalMinutes = config.updateIntervalMinutes || 0;
        this.format = config.format || 'json';
        this.data = null;
        this._onUpdateProcessing = [];

        if (!this.remoteUrl && !this.localUrl) {
            throw new Error('invalid config: need a remote or local URL (or both)');
        }

        /**
         * @type {Promise<void>} Promise that resolves once this resouce has been loaded
         * (i.e. `this.data` contains the resource contents)
         */
        this.ready = this.checkForUpdates();
        /**
         * @type {Promise} Promise that resolves after resource is loaded, and all `onUpdate`
         * callbacks have resolved.
         */
        this.allLoadingFinished = new Promise((resolve) => {
            this.addEventListener(AFTER_UPDATE_EVENT_NAME, resolve);
        });

        if (this.updateIntervalMinutes) {
            const alarmName = `updateResource: ${this.name}`;
            createAlarm(alarmName, { periodInMinutes: this.updateIntervalMinutes });
            alarms.onAlarm.addListener((alarmEvent) => {
                if (alarmEvent.name === alarmName) {
                    this.checkForUpdates();
                }
            });
        }
    }

    get lastUpdate() {
        return this.settings.getSetting(`${this.name}-lastUpdate`) || 0;
    }

    set lastUpdate(value) {
        this.settings.updateSetting(`${this.name}-lastUpdate`, value);
    }

    get etag() {
        return this.settings.getSetting(`${this.name}-etag`) || '';
    }

    set etag(value) {
        this.settings.updateSetting(`${this.name}-etag`, value);
    }

    async checkForUpdates(force) {
        await this.settings.ready();
        const remoteUrl = this.remoteUrl instanceof Function ? await this.remoteUrl() : this.remoteUrl;
        const loadFromDb = this._loadFromDB.bind(this);
        const loadFromRemote = this._loadFromURL.bind(this, remoteUrl);
        const loadFromRemoteNoCache = this._loadFromURL.bind(this, remoteUrl, false, true);
        const loadFromLocal = this._loadFromURL.bind(this, this.localUrl, true);
        let loadOrder = [];
        if (this.remoteUrl && Date.now() - this.lastUpdate < this.updateIntervalMinutes * 1000 * 60 && !force) {
            // load from DB first as it should be fresh
            loadOrder = [loadFromDb, loadFromRemoteNoCache];
        } else if (this.remoteUrl) {
            loadOrder = [loadFromRemote, loadFromDb];
        }
        // The last backup is the local file
        if (this.localUrl) {
            loadOrder.push(loadFromLocal);
        }

        for (const loader of loadOrder) {
            try {
                const result = await loader();
                await this._updateData(result);
                break;
            } catch (e) {
                // console.warn('Load failed...', e);
                continue;
            }
        }
    }

    async _loadFromDB() {
        console.log(`Load ${this.name} from DB`);
        const dbc = await this._getDb();
        const list = await dbc.table('tdsStorage').get({ name: this.name });
        return {
            contents: list.data,
        };
    }

    async _loadFromURL(url, local = false, nocache = false) {
        console.log(`Load ${this.name} from url`);
        const request = new Request(url);
        /** @type {HeadersInit} */
        const headers = {};
        if (!local && !nocache && this.etag) {
            headers['If-None-Match'] = this.etag;
        }
        const response = await fetch(request, { headers });
        if (response.status === 304) {
            throw new Error('304: Not modified');
        }
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        const contents = await response[this.format]();
        return {
            contents,
            etag: local ? bundledEtags[`${this.name}-etag`] : response.headers.get('etag'),
        };
    }

    async _getDb() {
        if (!ResourceLoader.dbc) {
            const dbc = new Dexie('tdsStorage');
            dbc.version(1).stores({
                tdsStorage: 'name,data',
            });
            ResourceLoader.dbc = dbc;
            await dbc.open();
        }
        return ResourceLoader.dbc;
    }

    /**
     * @param {{
     *  contents: any;
     *  etag?: string;
     * }} result
     * @param {boolean} waitForUpdateProcessing
     */
    async _updateData(result, waitForUpdateProcessing = false) {
        console.log(`Loaded ${this.name}:`, result);
        const updated = !!(this.data === null || this.etag);
        this.data = result.contents;

        if (result.etag) {
            const dbc = await this._getDb();
            await dbc.table('tdsStorage').put({ name: this.name, data: result.contents });
            this.etag = result.etag;
            this.lastUpdate = Date.now();
        }
        if (updated) {
            this.dispatchEvent(
                new CustomEvent('update', {
                    detail: {
                        name: this.name,
                        etag: this.etag,
                        data: this.data,
                    },
                }),
            );
            // After dispatchEvent, the return values of all onUpdate listeners will have been
            // added to this._onUpdateProcessing, so we can wait for those promises to resolve.
            const updateProcessing = Promise.all(this._onUpdateProcessing).then(() => {
                this._onUpdateProcessing = [];
                this.dispatchEvent(new Event(AFTER_UPDATE_EVENT_NAME));
            });

            // When configurations are being overridden, e.g. from the developer
            // tools, it's useful to then wait for the update processing to have
            // finished. That way, for MV3 builds the returned Promise will only
            // resolve after the corresponding ruleset changes have been made.
            if (waitForUpdateProcessing) {
                await updateProcessing;
            }
        }
    }

    /**
     * @param {OnUpdatedCallback} cb
     */
    onUpdate(cb) {
        this.addEventListener('update', (ev) => {
            if (ev instanceof CustomEvent) {
                const { name, etag, data } = ev.detail;
                const result = cb(name, etag, data);
                if (result instanceof Promise) {
                    this._onUpdateProcessing.push(result);
                }
            }
        });
    }

    /**
     * Manually set the value of this resource
     * @param {any} data
     */
    async overrideDataValue(data) {
        // create an etag hash based on the content
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(data)));
        const etag = [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, '0')).join('');
        await this._updateData(
            {
                contents: data,
                etag,
            },
            true,
        );
    }

    /**
     * Modify resource data in-place
     * @param {(data: any) => any} func
     */
    async modify(func) {
        await this.ready;
        const newValue = func(this.data);
        await this.overrideDataValue(newValue);
    }
}
