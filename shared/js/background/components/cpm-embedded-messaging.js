import { getFromSessionStorage, setToSessionStorage } from '../wrapper';

/* global DEBUG */

/**
 * @typedef {import('./cookie-prompt-management').CPMMessagingBase} CPMMessagingBase
 * @typedef {import('./native-messaging').NativeMessagingInterface} NativeMessagingInterface
 * @typedef {{ time: number, value: any }} CacheEntry
 */

const SUBFEATURE_CHECK_TTL = 30 * 1000; // 30s
const SETTING_CHECK_TTL = 10 * 1000; // 10s
const SITE_CHECK_TTL = 3 * 1000; // 3s (to be able to respond to Protections toggle changes)
const MAX_CACHE_SIZE = 100;

/**
 * CPM messaging for embedded extension.
 * @implements {CPMMessagingBase}
 */
export class CPMEmbeddedMessaging {
    /**
     * @param {NativeMessagingInterface} nativeMessaging
     */
    constructor(nativeMessaging) {
        this.nativeMessaging = nativeMessaging;
        /** @type {Map<string, CacheEntry>} */
        this._cache = new Map();
        /** @type {Promise<void>} */
        this._queue = Promise.resolve();
    }

    /**
     * Enqueue a notification message to be sent to the native app.
     * @param {string} method
     * @param {Record<string, any>} params
     */
    async _notify(method, params) {
        const result = this._queue
            .then(() => {
                return this.nativeMessaging.notify(method, params);
            })
            .catch((e) => {
                console.error('error in notification queue', e);
            });
        this._queue = result;
        await result;
    }

    /**
     * Enqueue a request to the native app and wait for a response,
     * blocking subsequent callers until the request is complete.
     * If cacheKey and ttl are provided, the result is cached and
     * returned immediately on subsequent calls within the TTL.
     * @param {string} method
     * @param {Record<string, any>} params
     * @param {string} [cacheKey]
     * @param {number} [ttl]
     * @returns {Promise<any>}
     */
    _request(method, params, cacheKey, ttl) {
        const job = this._queue
            .then(async () => {
                if (cacheKey && ttl) {
                    const cached = this._cache.get(cacheKey);
                    if (cached && Date.now() - cached.time < ttl) {
                        return cached.value;
                    }
                }
                const result = await this.nativeMessaging.request(method, params);
                if (cacheKey && ttl) {
                    // evict the oldest entry if the cache is full
                    if (this._cache.size >= MAX_CACHE_SIZE) {
                        // Map are iterated in insertion order, so the oldest entry is the first one
                        const oldest = this._cache.keys().next().value;
                        if (oldest !== undefined) this._cache.delete(oldest);
                    }
                    this._cache.set(cacheKey, { time: Date.now(), value: result });
                }
                return result;
            })
            .catch((e) => {
                console.error(`error in request queue for ${method}`, e);
            });
        this._queue = job;
        return job;
    }

    async logMessage(message) {
        console.log(message);
        await this._notify('extensionLog', {
            message,
        });
    }

    async refreshDashboardState(tabId, url, dashboardState) {
        await this._notify('refreshCpmDashboardState', {
            tabId,
            url,
            consentStatus: dashboardState,
        });
    }

    async showCpmAnimation(tabId, topUrl, isCosmetic) {
        await this._notify('showCpmAnimation', {
            tabId,
            topUrl,
            isCosmetic,
        });
    }

    async notifyPopupHandled(tabId, msg) {
        await this._notify('cookiePopupHandled', {
            tabId,
            msg,
        });
    }

    async checkAutoconsentSettingEnabled() {
        const result = await this._request('isAutoconsentSettingEnabled', {}, 'userSetting', SETTING_CHECK_TTL);
        return result?.enabled ?? false;
    }

    async checkAutoconsentEnabledForSite(url) {
        const result = await this._request('isFeatureEnabled', { featureName: 'autoconsent', url }, `site:${url}`, SITE_CHECK_TTL);
        return result?.enabled ?? false;
    }

    async checkSubfeatureEnabled(subfeatureName) {
        const result = await this._request(
            'isSubFeatureEnabled',
            { featureName: 'autoconsent', subfeatureName },
            `subfeature:${subfeatureName}`,
            SUBFEATURE_CHECK_TTL,
        );
        return result?.enabled ?? false;
    }

    async sendPixel(pixelName, type, params) {
        await this._notify('sendPixel', {
            pixelName,
            type,
            params,
        });
    }

    async refreshRemoteConfig() {
        console.log(`fetching config from native`);
        const cachedConfig = (await getFromSessionStorage('config')) || { version: 'unknown' };
        const cachedConfigVersion = `${cachedConfig.version}`;
        DEBUG && console.log(`cachedConfig: ${JSON.stringify(cachedConfig)}`);

        try {
            // we don't use the request queue here because config fetching should be async
            const result = await this.nativeMessaging.request('getResourceIfNew', { name: 'config', version: cachedConfigVersion });
            if (result.updated) {
                const config = result.data;
                await setToSessionStorage('config', config);
                return config;
            }
            return cachedConfig;
        } catch (e) {
            this.logMessage(`error refreshing remote config: ${e}`);
            if (cachedConfigVersion !== 'unknown') {
                return cachedConfig;
            }
            throw e;
        }
    }
}
