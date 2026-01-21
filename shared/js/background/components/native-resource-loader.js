import ResourceLoaderBase from './resource-loader-base.js';

/**
 * @typedef {import('./resource-loader-base.js').ResourceName} ResourceName
 * @typedef {import('./resource-loader-base.js').OnUpdatedCallback} OnUpdatedCallback
 * @typedef {import('./resource-loader-base.js').ResourceConfig} ResourceConfig
 * @typedef {import('./native-messaging.js').default} NativeMessaging
 * @typedef {import('../settings.js')} Settings
 *
 * @typedef {object} NativeResourceConfig
 * @property {ResourceName} name
 * @property {number} [updateIntervalMinutes]
 * @property {'json'|'text'} [format]
 * @property {any} [initialData] - Optional initial data to load immediately
 */

/**
 * Resource loader that fetches data from the native app via messaging APIs.
 */

/* global DEBUG */
export default class NativeResourceLoader extends ResourceLoaderBase {
    /**
     * @param {NativeResourceConfig} config
     * @param {{
     *  nativeMessaging: NativeMessaging
     *  settings: Settings
     * }} opts
     */
    constructor(config, opts) {
        super(
            {
                name: config.name,
                updateIntervalMinutes: config.updateIntervalMinutes,
                format: config.format,
            },
            { settings: opts.settings },
        );
        this._nativeMessaging = opts.nativeMessaging;
    }

    async _loadFromNative() {
        console.log(`NativeResourceLoader: fetching ${this.name} from native`);
        const result = await this._nativeMessaging.request('getPrivacyConfigIfNew', { name: this.name, version: this.etag });
        if (result.status === 'success') {
            if (result.data.updated) {
                return { contents: result.data.data, etag: `${result.data.version}` };
            } else {
                // no updates, fall back to the cached version
                throw new Error(`NativeResourceLoader: no updates for ${this.name}`);
            }
        } else {
            throw new Error(`NativeResourceLoader: Failed to fetch ${this.name} from native: ${result.error}`);
        }
    }

    /**
     * Check for updates by requesting data from native app.
     */
    async checkForUpdates() {
        await this.settings.ready();

        const loadFromNative = this._loadFromNative.bind(this);
        const loadFromDb = this._loadFromDB.bind(this);
        const loadOrder = [loadFromNative, loadFromDb];
        for (const loader of loadOrder) {
            try {
                const result = await loader();
                await this._updateData(result);
                break;
            } catch (e) {
                DEBUG && console.log(`Error fetching ${this.name} from ${loader.name}: ${e}`);
                continue;
            }
        }
    }
}
