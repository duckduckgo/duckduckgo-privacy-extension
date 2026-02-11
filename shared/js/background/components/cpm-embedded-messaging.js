import { getFromSessionStorage, setToSessionStorage } from '../wrapper';

/* global DEBUG */

/**
 * @typedef {import('./cookie-prompt-management').CPMMessagingBase} CPMMessagingBase
 * @typedef {import('./native-messaging').NativeMessagingInterface} NativeMessagingInterface
 */

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
        try {
            const result = await this.nativeMessaging.request('isAutoconsentSettingEnabled', {});
            return result.enabled;
        } catch (e) {
            console.error('error checking autoconsent setting enabled', e);
            return false;
        }
    }

    async checkAutoconsentEnabledForSite(url) {
        try {
            const result = await this.nativeMessaging.request('isFeatureEnabled', {
                featureName: 'autoconsent',
                url,
            });
            return result.enabled;
        } catch (e) {
            console.error('error checking autoconsent enabled for site', e);
            return false;
        }
    }

    async checkSubfeatureEnabled(subfeatureName) {
        try {
            const result = await this.nativeMessaging.request('isSubFeatureEnabled', {
                featureName: 'autoconsent',
                subfeatureName,
            });
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
