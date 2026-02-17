import browser from 'webextension-polyfill';
/* global DEBUG */

const DEFAULT_NATIVE_APP_ID = 'com.duckduckgo.macos.browser';

/**
 * @typedef {import('@duckduckgo/content-scope-scripts/messaging/schema.js').RequestMessage} RequestMessage
 * @typedef {import('@duckduckgo/content-scope-scripts/messaging/schema.js').NotificationMessage} NotificationMessage
 * @typedef {import('@duckduckgo/content-scope-scripts/messaging/schema.js').MessageResponse} MessageResponse
 */

/**
 * @typedef {{
 *  notify: (method: string, params: Record<string, any>) => Promise<void>;
 *  request: (method: string, params: Record<string, any>) => Promise<any>;
 *  subscribe: (msg: any, callback: (msg: any) => void) => void;
 * }} NativeMessagingInterface
 */

/**
 * Messaging for communication with the native app based on Native Messaging API.
 * It mimics the C-S-S messaging API.
 *
 * Uses `browser.runtime.sendNativeMessage` instead of `browser.runtime.connectNative` because that is unreliable
 * see https://app.asana.com/1/137249556945/task/1212463850466010/comment/1213200228981366?focus=true
 *
 * Note: Subscriptions are not supported because service workers can sleep,
 * causing the port connection to be lost. Use request/response patterns instead.
 */
/**
 * @implements {NativeMessagingInterface}
 */
export default class NativeMessaging {
    /**
     * @param {string} context
     * @param {string} featureName
     * @param {string} [appId]
     */
    constructor(context, featureName, appId = DEFAULT_NATIVE_APP_ID) {
        this._appId = appId;
        this._context = context;
        this._featureName = featureName;
    }

    /**
     * Send a fire-and-forget notification to the native app.
     *
     * @param {string} method - The method name to call on the native side
     * @param {Record<string, any>} [params] - Optional parameters to send
     */
    async notify(method, params = {}) {
        const msg = /** @type {NotificationMessage} */ ({
            context: this._context,
            featureName: this._featureName,
            method,
            params,
        });
        DEBUG && console.log('[NativeMessaging] NOTIFY', `${this._context}.${this._featureName}.${method}`, params);
        await browser.runtime.sendNativeMessage(this._appId, msg).catch((e) => {
            DEBUG && console.error('[NativeMessaging] notification error:', e);
            throw e;
        });
    }

    /**
     * Send a request to the native app and wait for a response.
     *
     * @param {string} method - The method name to call on the native side
     * @param {Record<string, any>} [params] - Optional parameters to send
     * @returns {Promise<any>}
     */
    async request(method, params = {}) {
        const id = crypto.randomUUID();
        const msg = /** @type {RequestMessage} */ ({
            context: this._context,
            featureName: this._featureName,
            id,
            method,
            params,
        });
        DEBUG && console.log('[NativeMessaging] REQUEST', `${this._context}.${this._featureName}.${method}`, `id=${id}`, params);

        const response = /** @type {MessageResponse} */ (
            await browser.runtime.sendNativeMessage(this._appId, msg).catch((e) => {
                DEBUG && console.error('[NativeMessaging] error:', e);
                return {
                    id,
                    context: this._context,
                    featureName: this._featureName,
                    error: {
                        message: `NativeMessaging request-response error: ${e}`,
                    },
                };
            })
        );
        DEBUG && console.log('[NativeMessaging] Received from native:', JSON.stringify(response));

        if (!response || typeof response !== 'object') {
            throw new Error(`NativeMessaging: unexpected response type: ${typeof response}`);
        }

        if ('error' in response && response.error) {
            DEBUG && console.log('[NativeMessaging] RESPONSE ERROR', `id=${id}`, response.error);
            throw new Error(response.error.message || 'Unknown error');
        }

        DEBUG && console.log('[NativeMessaging] RESPONSE OK', `id=${id}`, response.result);
        return response.result || {};
    }

    subscribe(_msg, _callback) {
        throw new Error('Subscriptions are not supported over Native Messaging API');
    }
}
