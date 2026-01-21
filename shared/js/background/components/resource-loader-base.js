import Dexie from 'dexie';
import { alarms } from 'webextension-polyfill';
import { createAlarm } from '../wrapper';

/**
 * @typedef {'tds' | 'surrogates' | 'config'} ResourceName
 *
 * @typedef {object} ResourceConfig
 * @property {ResourceName} name
 * @property {number} [updateIntervalMinutes]
 * @property {'json'|'text'} [format]
 *
 * @typedef {(resourceName: ResourceName, etag: string, value: any) => Promise<any> | void} OnUpdatedCallback
 * @typedef {import('../settings.js')} Settings
 */

const AFTER_UPDATE_EVENT_NAME = 'afterUpdate';

/**
 * Abstract base class for resource loading with common interface and refresh logic.
 * Subclasses must implement `_fetchResource()` to provide the actual data fetching mechanism.
 */
export default class ResourceLoaderBase extends EventTarget {
    /** @type {Dexie?} */
    static dbc = null;
    /**
     * @param {ResourceConfig} config
     * @param {{
     *  settings?: Settings
     * }} opts
     */
    constructor(config, { settings } = {}) {
        super();
        this.settings = settings || null;
        this.name = config.name;
        this.updateIntervalMinutes = config.updateIntervalMinutes || 0;
        this.format = config.format || 'json';
        this.data = null;
        this._onUpdateProcessing = [];
        this._etag = '';
        this._lastUpdate = 0;
        this._ready = null;

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

    /**
     * @type {Promise<void>} Promise that resolves once this resource has been loaded
     * (i.e. `this.data` contains the resource contents)
     */
    get ready() {
        if (this._ready) {
            return this._ready;
        }
        this._ready = this.checkForUpdates();
        return this._ready;
    }

    get lastUpdate() {
        if (this.settings) {
            return this.settings.getSetting(`${this.name}-lastUpdate`) || 0;
        }
        return this._lastUpdate;
    }

    set lastUpdate(value) {
        if (this.settings) {
            this.settings.updateSetting(`${this.name}-lastUpdate`, value);
        } else {
            this._lastUpdate = value;
        }
    }

    get etag() {
        if (this.settings) {
            return this.settings.getSetting(`${this.name}-etag`) || '';
        }
        return this._etag;
    }

    set etag(value) {
        if (this.settings) {
            this.settings.updateSetting(`${this.name}-etag`, value);
        } else {
            this._etag = value;
        }
    }

    /**
     * Check for updates and call _updateData() with updated data.
     * Subclasses must implement this method.
     * @param {boolean} [force] - Force update even if cache is fresh
     * @returns {Promise<void>}
     * @abstract
     */
    async checkForUpdates(force) {
        throw new Error('checkForUpdates must be implemented by subclass');
    }

    /**
     * Update the resource data and dispatch update events.
     * @param {{
     *  contents: any;
     *  etag?: string;
     * }} result
     * @param {boolean} waitForUpdateProcessing
     * @protected
     */
    async _updateData(result, waitForUpdateProcessing = false) {
        console.log(`Loaded ${this.name}:`, result);
        const updated = !!(this.data === null || this.etag);
        this.data = result.contents;

        if (result.etag) {
            await this._persistData(result);
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
     * Get the shared IndexedDB database instance.
     * @returns {Promise<Dexie>}
     * @protected
     */
    async _getDb() {
        if (!ResourceLoaderBase.dbc) {
            const dbc = new Dexie('tdsStorage');
            dbc.version(1).stores({
                tdsStorage: 'name,data',
            });
            ResourceLoaderBase.dbc = dbc;
            await dbc.open();
        }
        return ResourceLoaderBase.dbc;
    }

    /**
     * Load resource data from IndexedDB cache.
     * @returns {Promise<{contents: any}>}
     * @protected
     */
    async _loadFromDB() {
        console.log(`Load ${this.name} from DB`);
        const dbc = await this._getDb();
        const list = await dbc.table('tdsStorage').get({ name: this.name });
        return {
            contents: list.data,
        };
    }

    /**
     * Persist data to IndexedDB.
     * @param {{contents: any, etag?: string}} result
     * @protected
     */
    async _persistData(result) {
        const dbc = await this._getDb();
        await dbc.table('tdsStorage').put({ name: this.name, data: result.contents });
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
