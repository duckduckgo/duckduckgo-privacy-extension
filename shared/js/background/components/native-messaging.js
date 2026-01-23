/**
 * Native messaging for WebKit-based browser extensions.
 *
 * This module provides a MessagingTransport for C-S-S messaging that uses
 * `browser.runtime.connectNative()` to communicate with the native macOS/iOS app.
 *
 * Note: Subscriptions are not supported because service workers can sleep,
 * causing the port connection to be lost. Use request/response patterns instead.
 */
import browser from 'webextension-polyfill';
import {
    Messaging,
    MessagingContext,
    TestTransportConfig,
} from '@duckduckgo/content-scope-scripts/messaging/schema';

/* global DEBUG */

const NATIVE_APP_ID = 'com.duckduckgo.macos.browser';

/**
 * @typedef {import('webextension-polyfill').Runtime.Port} RuntimePort
 * @typedef {import('@duckduckgo/content-scope-scripts/messaging/index.js').MessagingTransport} MessagingTransport
 * @typedef {import('@duckduckgo/content-scope-scripts/messaging/index.js').NotificationMessage} NotificationMessage
 * @typedef {import('@duckduckgo/content-scope-scripts/messaging/index.js').RequestMessage} RequestMessage
 * @typedef {import('@duckduckgo/content-scope-scripts/messaging/index.js').Subscription} Subscription
 */

/**
 * MessagingTransport implementation for WebKit-based browser extensions.
 *
 * Uses `browser.runtime.connectNative()` to establish a port-based connection
 * to the native app.
 *
 * @implements {MessagingTransport}
 */
class WebkitExtensionTransport {
    /**
     * @param {string} applicationId
     * @param {MessagingContext} messagingContext
     */
    constructor(applicationId, messagingContext) {
        this._applicationId = applicationId;
        this._messagingContext = messagingContext;

        /** @type {RuntimePort | null} */
        this._port = null;

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

        this._port = browser.runtime.connectNative(this._applicationId);

        this._port.onMessage.addListener((message) => {
            this._handleMessage(message);
        });

        this._port.onDisconnect.addListener(() => {
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
     * @param {Record<string, any>} message
     * @private
     */
    _handleMessage(message) {
        if ('id' in message && message.id) {
            const pending = this._pendingRequests.get(message.id);
            if (pending) {
                this._pendingRequests.delete(message.id);

                if ('error' in message && message.error) {
                    pending.reject(new Error(message.error.message || 'Unknown error'));
                } else {
                    pending.resolve(message.result || {});
                }
            }
        }
    }

    /**
     * @param {NotificationMessage} msg
     */
    notify(msg) {
        try {
            const port = this._getPort();
            port.postMessage({
                method: msg.method,
                params: msg.params || {},
            });
        } catch (e) {
            if (this._messagingContext.env === 'development') {
                console.error('[NativeMessaging] Failed to send notification:', e);
            }
        }
    }

    /**
     * @param {RequestMessage} msg
     * @returns {Promise<any>}
     */
    request(msg) {
        return new Promise((resolve, reject) => {
            this._pendingRequests.set(msg.id, { resolve, reject });

            try {
                const port = this._getPort();
                port.postMessage({
                    method: msg.method,
                    id: msg.id,
                    params: msg.params || {},
                });
            } catch (e) {
                this._pendingRequests.delete(msg.id);
                reject(e);
            }
        });
    }

    /**
     * @param {Subscription} _msg
     * @param {(value: unknown) => void} _callback
     * @returns {() => void}
     */
    subscribe(_msg, _callback) {
        throw new Error('Subscriptions are not supported in WebkitExtensionTransport');
    }
}

/**
 * NativeMessaging provides a simplified interface for communicating with
 * the native app from a WebKit-based browser extension.
 */
export default class NativeMessaging {
    /**
     * @param {object} [config]
     * @param {string} [config.applicationId] - Native app bundle identifier
     * @param {string} [config.context] - Message context
     * @param {string} [config.featureName] - Feature name
     * @param {'production' | 'development'} [config.env] - Environment
     */
    constructor(config = {}) {
        const {
            applicationId = NATIVE_APP_ID,
            context = 'ddgInternalExtension',
            featureName = 'autoconsent',
            env = DEBUG ? 'development' : 'production',
        } = config;

        const messagingContext = new MessagingContext({
            context,
            featureName,
            env,
        });

        const transport = new WebkitExtensionTransport(applicationId, messagingContext);

        /** @type {Messaging} */
        this._messaging = new Messaging(messagingContext, new TestTransportConfig(transport));
    }

    /**
     * Send a request and wait for a response.
     *
     * @param {string} method - The method name to call on the native side
     * @param {Record<string, any>} [params] - Optional parameters to send
     * @returns {Promise<any>} - The result from the native side
     */
    async request(method, params = {}) {
        DEBUG && console.log('[NativeMessaging] request', method, params);
        const response = await this._messaging.request(method, params);
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
        this._messaging.notify(method, params);
    }

    /**
     * Get the underlying Messaging instance for advanced usage.
     * @returns {Messaging}
     */
    get messaging() {
        return this._messaging;
    }
}
