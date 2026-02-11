import { getFromSessionStorage, setToSessionStorage } from '../wrapper';

/* global DEBUG */

/**
 * @typedef {import('./cookie-prompt-management').CPMMessagingBase} CPMMessagingBase
 * @typedef {import('./native-messaging').NativeMessagingInterface} NativeMessagingInterface
 * @typedef {{ time: number, value: boolean }} CacheEntry
 * @typedef {{
 *  setting: CacheEntry | null,
 *  subfeature: Map<string, CacheEntry>,
 *  site: Map<string, CacheEntry>
 * }} NativeCallCache
 */

const SUBFEATURE_CHECK_TTL = 30 * 60 * 1000; // 30 minutes
const SETTING_CHECK_TTL = 10 * 1000; // 10 seconds
const SITE_CHECK_TTL = 30 * 60 * 1000; // 30 minutes
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
        /** @type {NativeCallCache} */
        this._cache = {
            setting: null,
            subfeature: new Map(),
            site: new Map(),
        };
    }

    async logMessage(message) {
        console.log(message);
        await this.nativeMessaging.notify('extensionLog', {
            message,
        });
    }

    async refreshDashboardState(tabId, url, dashboardState) {
        await this.nativeMessaging.notify('refreshCpmDashboardState', {
            tabId,
            url,
            consentStatus: dashboardState,
        });
    }

    async showCpmAnimation(tabId, topUrl, isCosmetic) {
        await this.nativeMessaging.notify('showCpmAnimation', {
            tabId,
            topUrl,
            isCosmetic,
        });
    }

    async notifyPopupHandled(tabId, msg) {
        await this.nativeMessaging.notify('cookiePopupHandled', {
            tabId,
            msg,
        });
    }

    async checkAutoconsentSettingEnabled() {
        const cached = this._cache.setting;
        if (cached && Date.now() - cached.time < SETTING_CHECK_TTL) {
            return cached.value;
        }
        try {
            const result = await this.nativeMessaging.request('isAutoconsentSettingEnabled', {});
            this._cache.setting = { time: Date.now(), value: result.enabled };
            return result.enabled;
        } catch (e) {
            console.error('error checking autoconsent setting enabled', e);
            return false;
        }
    }

    async checkAutoconsentEnabledForSite(url) {
        const cached = this._cache.site.get(url);
        if (cached && Date.now() - cached.time < SITE_CHECK_TTL) {
            return cached.value;
        }
        try {
            const result = await this.nativeMessaging.request('isFeatureEnabled', {
                featureName: 'autoconsent',
                url,
            });
            const map = this._cache.site;
            if (map.size >= MAX_CACHE_SIZE) {
                // Map iterates in insertion order, so the oldest entry is the first one
                const oldest = map.keys().next().value;
                if (oldest !== undefined) map.delete(oldest);
            }
            map.set(url, { time: Date.now(), value: result.enabled });
            return result.enabled;
        } catch (e) {
            console.error('error checking autoconsent enabled for site', e);
            return false;
        }
    }

    async checkSubfeatureEnabled(subfeatureName) {
        const cached = this._cache.subfeature.get(subfeatureName);
        if (cached && Date.now() - cached.time < SUBFEATURE_CHECK_TTL) {
            return cached.value;
        }
        try {
            const result = await this.nativeMessaging.request('isSubFeatureEnabled', {
                featureName: 'autoconsent',
                subfeatureName,
            });
            const map = this._cache.subfeature;
            if (map.size >= MAX_CACHE_SIZE) {
                const oldest = map.keys().next().value;
                if (oldest !== undefined) map.delete(oldest);
            }
            map.set(subfeatureName, { time: Date.now(), value: result.enabled });
            return result.enabled;
        } catch (e) {
            console.error('error checking autoconsent subfeature enabled', e);
            return false;
        }
    }

    async sendPixel(pixelName, type, params) {
        await this.nativeMessaging.notify('sendPixel', {
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
