import ResourceLoaderBase from './resource-loader-base.js';

/**
 * @typedef {import('./resource-loader-base.js').ResourceName} ResourceName
 * @typedef {import('./resource-loader-base.js').OnUpdatedCallback} OnUpdatedCallback
 * @typedef {import('./resource-loader-base.js').ResourceConfig} ResourceConfig
 * @typedef {import('./native-messaging.js').NativeMessaging} NativeMessaging
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
export default class NativeResourceLoader extends ResourceLoaderBase {
    /**
     * @param {NativeResourceConfig} config
     * @param {{
     *  nativeMessaging: NativeMessaging
     * }} opts
     */
    constructor(config, opts) {
        super(
            {
                name: config.name,
                updateIntervalMinutes: config.updateIntervalMinutes,
                format: config.format,
            },
            {},
        );
        this._nativeMessaging = opts.nativeMessaging;
        if (config.initialData) {
            this._ready = this._updateData({ contents: config.initialData });
        }
    }

    /**
     * Check for updates by requesting data from native app.
     */
    async checkForUpdates() {
        try {
            console.log(`NativeResourceLoader: Fetching ${this.name} from native`);
            const result = await this._nativeMessaging.request(this.name, { version: this.etag });
            await this._updateData({ contents: result.data, etag: `${result.data.version}` });
        } catch (e) {
            console.error(`NativeResourceLoader: Failed to fetch ${this.name} from native:`, e);
        }
    }
}
