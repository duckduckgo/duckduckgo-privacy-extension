import NativeMessaging from './native-messaging';
// FIXME: THIS IS ONLY ADDED FOR TESTING, REMOVE BEFORE MERGING
import bundledConfig from '../../../data/bundled/macos-config.json';
import { getFromSessionStorage, setToSessionStorage } from '../wrapper';

/* global DEBUG */

/**
 * @typedef {import('./cookie-prompt-management').CPMMessagingBase} CPMMessagingBase
 */

/**
 * Mock implementation of NativeMessaging for testing while native side is not ready.
 */
class NativeMessagingMock extends NativeMessaging {
    async request(method, params = {}) {
        DEBUG && console.log('[NativeMessaging] request', method, params);
        let response = {};
        switch (method) {
            case 'getResourceIfNew':
                if (params.version && params.version === `${bundledConfig.version}`) {
                    response = {
                        updated: false,
                    };
                } else {
                    response = {
                        updated: true,
                        data: bundledConfig,
                        version: `${bundledConfig.version}`,
                    };
                }
                break;
            case 'isFeatureEnabled':
                response = {
                    enabled: true,
                };
                break;
            case 'isSubFeatureEnabled':
                response = {
                    enabled: true,
                };
                break;
            case 'sendPixel':
                response = {
                    success: true,
                };
                break;
            default:
                throw new Error(`[NativeMessaging] request: unknown method ${method}`);
        }
        DEBUG && console.log('[NativeMessaging] response', response);
        return response;
    }

    /**
     * Send a fire-and-forget notification.
     *
     * @param {string} method - The method name to call on the native side
     * @param {Record<string, any>} [params] - Optional parameters to send
     */
    notify(method, params = {}) {
        DEBUG && console.log('[NativeMessaging] notify', method, params);
        // no-op
    }
}

/**
 * CPM messaging for embedded extension.
 * @implements {CPMMessagingBase}
 */
export class CPMEmbeddedMessaging {
    constructor() {
        this.nativeMessaging = new NativeMessagingMock('ddgInternalExtension', 'autoconsent');
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
        DEBUG && console.log('cachedConfig', cachedConfig);

        try {
            const result = await this.nativeMessaging.request('getResourceIfNew', { name: 'config', version: cachedConfigVersion });
            if (result.updated) {
                await setToSessionStorage('config', result.data);
                return result.data;
            }
            return cachedConfig;
        } catch (e) {
            console.error('error refreshing remote config', e);
            if (cachedConfigVersion !== 'unknown') {
                return cachedConfig;
            }
            throw e;
        }
    }
}
