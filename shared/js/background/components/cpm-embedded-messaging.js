import { getFromSessionStorage, setToSessionStorage } from '../wrapper';

/* global DEBUG */

/**
 * @typedef {import('./cookie-prompt-management').CPMMessagingBase} CPMMessagingBase
 * @typedef {import('./cookie-prompt-management').CpmDashboardState} CpmDashboardState
 * @typedef {import('./native-messaging').NativeMessagingInterface} NativeMessagingInterface
 * @typedef {{ time: number, value: any }} CacheEntry
 */

export const SUBFEATURE_CHECK_TTL = 30 * 1000; // 30s
export const SETTING_CHECK_TTL = 10 * 1000; // 10s
export const SITE_CHECK_TTL = 3 * 1000; // 3s (to be able to respond to Protections toggle changes)
export const MAX_CACHE_SIZE = 100;
export const NATIVE_MESSAGE_TIMEOUT_MS = 20 * 1000;

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
        // per-tab chains of dashboard notifications, to make sure the dashboard state is updated in order
        /** @type {Map<number, Promise<void>>} */
        this._dashboardNotifyChains = new Map();
        /** @type {((tabId: number | null, errorName: string) => void) | null} */
        this._diagnosticsErrorHandler = null; // callback to record diagnostics errors in CPM state
        // in-memory cached config, will be lost on extension sleep, in which case we fetch from session storage
        /** @type {import('@duckduckgo/privacy-configuration/schema/config.ts').CurrentGenericConfig | null} */
        this._cachedConfig = null;
    }

    /**
     * @param {(tabId: number | null, errorName: string) => void} handler
     */
    setDiagnosticsErrorHandler(handler) {
        this._diagnosticsErrorHandler = handler;
    }

    /**
     * @param {number | null} tabId
     * @param {string} method
     */
    _recordDiagnosticsError(tabId, method) {
        // generate a diagnostic error name for a native message, e.g. 'tab_getResourceIfNew'
        const scope = typeof tabId === 'number' ? 'tab' : 'glob';
        const errorName = `${scope}_${method}`;
        this._diagnosticsErrorHandler?.(tabId, errorName);
    }

    /**
     * Send a notification message to the native app.
     * @param {string} method
     * @param {Record<string, any>} params
     */
    async _notify(method, params) {
        const diagnosticsTabId = typeof params.tabId === 'number' ? params.tabId : null;
        try {
            await this._withTimeout(this.nativeMessaging.notify(method, params), method);
        } catch (e) {
            console.error('error sending native notification', e);
            this._recordDiagnosticsError(diagnosticsTabId, method);
        }
    }

    /**
     * Send a request to the native app and wait for a response.
     * If cacheKey and ttl are provided, the result is cached and
     * returned immediately on subsequent calls within the TTL.
     * @param {string} method
     * @param {Record<string, any>} params
     * @param {string} [cacheKey]
     * @param {number} [ttl]
     * @param {number=} diagnosticsTabId
     * @returns {Promise<any>}
     */
    async _request(method, params, cacheKey, ttl, diagnosticsTabId) {
        if (cacheKey && ttl) {
            const cached = this._cache.get(cacheKey);
            if (cached && Date.now() - cached.time < ttl) {
                return cached.value;
            }
        }

        try {
            const result = await this._withTimeout(this.nativeMessaging.request(method, params), method);
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
        } catch (e) {
            console.error(`error sending native request for ${method}`, e);
            this._recordDiagnosticsError(diagnosticsTabId ?? null, method);
        }
    }

    /**
     * @param {Promise<any>} operation
     * @param {string} method
     * @returns {Promise<any>}
     */
    async _withTimeout(operation, method) {
        /** @type {ReturnType<typeof setTimeout> | undefined} */
        let timeoutId;
        try {
            return await Promise.race([
                operation,
                new Promise((_resolve, reject) => {
                    timeoutId = setTimeout(
                        () => reject(new Error(`${method} timed out after ${NATIVE_MESSAGE_TIMEOUT_MS}ms`)),
                        NATIVE_MESSAGE_TIMEOUT_MS,
                    );
                }),
            ]);
        } finally {
            if (timeoutId !== undefined) clearTimeout(timeoutId);
        }
    }

    async logMessage(message, isDebug = DEBUG) {
        console.log(message);
        if (isDebug) {
            await this._notify('extensionLog', {
                message,
            });
        }
    }

    /**
     * @param {Partial<CpmDashboardState>} dashboardState
     */
    async refreshDashboardState(tabId, url, dashboardState) {
        const { cpmErrors, ...rest } = dashboardState;
        const currentChain = this._dashboardNotifyChains.get(tabId);
        const previous = currentChain ?? Promise.resolve();
        const notification = previous.then(() =>
            this._notify('refreshCpmDashboardState', {
                tabId,
                url,
                consentStatus: {
                    ...rest,
                    // convert cpmErrors from an array to a comma-separated string
                    ...(cpmErrors
                        ? {
                              // limit the length to avoid overflows in breakage pixel
                              cpmErrors: cpmErrors.join(',').substring(0, 255),
                          }
                        : {}),
                },
            }),
        );
        this._dashboardNotifyChains.set(tabId, notification);
        try {
            await notification;
        } finally {
            if (this._dashboardNotifyChains.get(tabId) === notification) {
                this._dashboardNotifyChains.delete(tabId);
            }
        }
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

    /**
     * Check autoconsent enabled state and user preference.
     * @param {number} [tabId]
     * @returns {Promise<import('./cookie-prompt-management').AutoconsentUserSettings>}
     */
    async checkAutoconsentSetting(tabId) {
        const result = await this._request('isAutoconsentSettingEnabled', {}, 'userSetting', SETTING_CHECK_TTL, tabId);
        return result ?? { enabled: false };
    }

    async checkAutoconsentEnabledForSite(url, tabId) {
        const result = await this._request('isFeatureEnabled', { featureName: 'autoconsent', url }, `site:${url}`, SITE_CHECK_TTL, tabId);
        return result?.enabled ?? false;
    }

    async checkSubfeatureEnabled(subfeatureName, tabId) {
        const result = await this._request(
            'isSubFeatureEnabled',
            { featureName: 'autoconsent', subfeatureName },
            `subfeature:${subfeatureName}`,
            SUBFEATURE_CHECK_TTL,
            tabId,
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
        const cachedConfig = this._cachedConfig || (await getFromSessionStorage('config')) || { version: 'unknown' };
        const cachedConfigVersion = `${cachedConfig.version}`;
        DEBUG && console.log(`cachedConfig: ${JSON.stringify(cachedConfig)}`);

        try {
            console.log(`fetching config from native, cachedConfigVersion: ${cachedConfigVersion}`);
            const result = await this._withTimeout(
                this.nativeMessaging.request('getResourceIfNew', { name: 'config', version: cachedConfigVersion }),
                'getResourceIfNew',
            );
            if (result.updated) {
                this._cachedConfig = result.data;
                try {
                    await setToSessionStorage('config', this._cachedConfig);
                } catch (e) {
                    // this can happen if quota is exceeded
                    this.logMessage(`error setting cached config to session storage: ${e}`);
                }
                return this._cachedConfig;
            }
            return cachedConfig;
        } catch (e) {
            this._recordDiagnosticsError(null, 'getResourceIfNew');
            this.logMessage(`error refreshing remote config: ${e}`);
            if (cachedConfigVersion !== 'unknown') {
                return cachedConfig;
            }
            throw e;
        }
    }
}
