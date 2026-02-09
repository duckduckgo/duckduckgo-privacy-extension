import browser from 'webextension-polyfill';
/* global DEBUG */

const DEFAULT_NATIVE_APP_ID = 'com.duckduckgo.macos.browser';

/**
 * @typedef {import('webextension-polyfill').Runtime.Port} RuntimePort
 * @typedef {import('@duckduckgo/content-scope-scripts/messaging/schema.js').RequestMessage} RequestMessage
 * @typedef {import('@duckduckgo/content-scope-scripts/messaging/schema.js').NotificationMessage} NotificationMessage
 * @typedef {import('@duckduckgo/content-scope-scripts/messaging/schema.js').MessageResponse} MessageResponse
 */

/**
 * Messaging for communication with the native app based on Native Messaging API.
 * It mimics the C-S-S messaging API.
 *
 * Note: Subscriptions are not supported because service workers can sleep,
 * causing the port connection to be lost. Use request/response patterns instead.
 */
export default class NativeMessaging {
    /**
     * @param {string} context
     * @param {string} featureName
     * @param {string} [appId]
     */
    constructor(context, featureName, appId = DEFAULT_NATIVE_APP_ID) {
        /** @type {RuntimePort | null} */
        this._port = null;

        this._appId = appId;
        this._context = context;
        this._featureName = featureName;

        /** @type {Map<string, {resolve: (value: any) => void, reject: (error: Error) => void}>} */
        this._pendingRequests = new Map();
    }

    /**
     * Get or establish the native connection.
     * @returns {RuntimePort}
     * @private
     */
    _getPort() {
        if (this._port) {
            return this._port;
        }

        DEBUG && console.log('[NativeMessaging] Connecting to native app:', this._appId);
        this._port = browser.runtime.connectNative(this._appId);
        this._port.onMessage.addListener((/** @type {MessageResponse} */ message) => {
            DEBUG && console.log('[NativeMessaging] Received from native:', JSON.stringify(message));
            this._handleMessage(message);
        });

        this._port.onDisconnect.addListener(() => {
            const error = browser.runtime.lastError;
            DEBUG && console.log('[NativeMessaging] Port disconnected', error ? `error: ${error.message}` : '');
            // Reject all pending requests
            for (const { reject } of this._pendingRequests.values()) {
                reject(new Error('Native connection closed'));
            }
            this._pendingRequests.clear();
            this._port = null;
        });

        return this._port;
    }

    /**
     * Handle incoming messages from native.
     * @param {MessageResponse} message
     * @private
     */
    _handleMessage(message) {
        if ('id' in message && message.id) {
            const pending = this._pendingRequests.get(message.id);
            if (pending) {
                this._pendingRequests.delete(message.id);

                if ('error' in message && message.error) {
                    DEBUG && console.log('[NativeMessaging] RESPONSE ERROR', `id=${message.id}`, message.error);
                    pending.reject(new Error(message.error.message || 'Unknown error'));
                } else {
                    DEBUG && console.log('[NativeMessaging] RESPONSE OK', `id=${message.id}`, message.result);
                    pending.resolve(message.result || {});
                }
            } else {
                DEBUG && console.warn('[NativeMessaging] No pending request for id:', message.id);
            }
        } else {
            DEBUG && console.log('[NativeMessaging] Unhandled native message (no id):', message);
        }
    }

    /**
     * @param {string} method - The method name to call on the native side
     * @param {Record<string, any>} [params] - Optional parameters to send
     */
    notify(method, params = {}) {
        try {
            const port = this._getPort();
            const msg = /** @type {NotificationMessage} */ ({
                context: this._context,
                featureName: this._featureName,
                method,
                params,
            });
            DEBUG && console.log('[NativeMessaging] NOTIFY', `${this._context}.${this._featureName}.${method}`, params);
            port.postMessage(msg);
        } catch (e) {
            DEBUG && console.error('[NativeMessaging] Failed to send notification:', e);
        }
    }

    /**
     * @param {string} method - The method name to call on the native side
     * @param {Record<string, any>} [params] - Optional parameters to send
     * @returns {Promise<any>}
     */
    request(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = crypto.randomUUID();
            this._pendingRequests.set(id, { resolve, reject });

            try {
                const port = this._getPort();
                const msg = /** @type {RequestMessage} */ ({
                    context: this._context,
                    featureName: this._featureName,
                    id,
                    method,
                    params,
                });
                DEBUG && console.log('[NativeMessaging] REQUEST', `${this._context}.${this._featureName}.${method}`, `id=${id}`, params);
                port.postMessage(msg);
            } catch (e) {
                this._pendingRequests.delete(id);
                reject(e);
            }
        });
    }

    subscribe(_msg, _callback) {
        throw new Error('Subscriptions are not supported in WebkitExtensionTransport');
    }
}
