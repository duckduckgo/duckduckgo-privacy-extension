import bundledEtags from '../../../data/etags.json';
import ResourceLoaderBase from './resource-loader-base.js';

/**
 * @typedef {import('./resource-loader-base.js').ResourceName} ResourceName
 * @typedef {import('./resource-loader-base.js').OnUpdatedCallback} OnUpdatedCallback
 * @typedef {import('./resource-loader-base.js').Settings} Settings
 *
 * @typedef {object} NetworkResourceConfig
 * @property {ResourceName} name
 * @property {string | (() => Promise<string>)} [remoteUrl]
 * @property {string} [localUrl]
 * @property {number} [updateIntervalMinutes]
 * @property {'json'|'text'} [format]
 */

/**
 * Resource loader that fetches data from network URLs with IndexedDB caching.
 */
export default class ResourceLoader extends ResourceLoaderBase {

    /**
     * @param {NetworkResourceConfig} config
     * @param {{
     *  settings: Settings
     * }} opts
     */
    constructor(config, { settings }) {
        if (!config.remoteUrl && !config.localUrl) {
            throw new Error('invalid config: need a remote or local URL (or both)');
        }

        super(
            {
                name: config.name,
                updateIntervalMinutes: config.updateIntervalMinutes,
                format: config.format,
            },
            { settings },
        );

        this.remoteUrl = config.remoteUrl;
        this.localUrl = config.localUrl;
    }

    /**
     * @param {boolean} [force]
     */
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
                continue;
            }
        }
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
}
