/**
 * Native messaging for WebKit-based browser extensions.
 *
 * This module wraps the Messaging class from content-scope-scripts,
 * configured with the WebkitExtensionMessagingTransport for communication
 * with the native macOS/iOS app.
 */
import browser from 'webextension-polyfill';
import {
    Messaging,
    MessagingContext,
    WebkitExtensionMessagingConfig,
} from '@duckduckgo/content-scope-scripts/messaging/index.js';

/**
 * NativeMessaging provides a simplified interface for communicating with
 * the native app from a WebKit-based browser extension.
 *
 * It wraps the C-S-S Messaging class with the WebkitExtensionMessagingTransport.
 *
 * Note: Subscriptions are not supported because service workers can sleep,
 * causing the port connection to be lost. Use request/response patterns instead.
 *
 */
/* global DEBUG */

const NATIVE_APP_ID = "com.duckduckgo.macos.browser";

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

        const messagingConfig = new WebkitExtensionMessagingConfig({
            applicationId,
            connectNative: browser.runtime.connectNative.bind(browser.runtime),
        });

        /** @type {Messaging} */
        this._messaging = new Messaging(messagingContext, messagingConfig);
    }

    /**
     * Send a request and wait for a response.
     *
     * @param {string} method - The method name to call on the native side
     * @param {Record<string, any>} [params] - Optional parameters to send
     * @returns {Promise<any>} - The result from the native side
     */
    request(method, params = {}) {
        return this._messaging.request(method, params);
    }

    /**
     * Send a fire-and-forget notification.
     *
     * @param {string} method - The method name to call on the native side
     * @param {Record<string, any>} [params] - Optional parameters to send
     */
    notify(method, params = {}) {
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
