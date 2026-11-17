import browser from 'webextension-polyfill';
/* global DEBUG */

const DEFAULT_NATIVE_APP_ID = 'com.duckduckgo.macos.browser';

/**
 * @typedef {import('@duckduckgo/content-scope-scripts/messaging/schema.js').RequestMessage} RequestMessage
 * @typedef {import('@duckduckgo/content-scope-scripts/messaging/schema.js').NotificationMessage} NotificationMessage
 * @typedef {import('@duckduckgo/content-scope-scripts/messaging/schema.js').MessageResponse} MessageResponse
 * @typedef {import('@duckduckgo/content-scope-scripts/messaging/schema.js').Subscription} Subscription
 */

/**
 * @typedef {{
 *  notify: (method: string, params: Record<string, any>) => Promise<void>;
 *  request: (method: string, params: Record<string, any>) => Promise<any>;
 *  subscribe: (subscriptionName: string, callback: (params: any) => void) => () => void;
 * }} NativeMessagingInterface
 */

/**
 * @typedef {{ featureName: string, subscriptionName: string, params?: Record<string, any> }} NativeSubscriptionEvent
 * @typedef {{ onCommand: { addListener: (listener: (command: string) => void) => void } }} CommandsApi
 * @typedef {(appId: string, message: any) => Promise<any>} SendNativeMessage
 */

/**
 * Manifest command (with no shortcut) the native app performs when it has subscription events for the extension.
 * WebKit wakes a sleeping background to deliver it.
 */
export const NATIVE_EVENT_COMMAND = 'ddg-native-event';
/** Native messaging feature the extension pulls queued subscription events from. */
export const NATIVE_EVENTS_FEATURE = 'nativeEvents';
/** Context of the transport's own messages to native. */
export const NATIVE_EVENTS_CONTEXT = 'ddgInternalExtension';

/** @type {NativeMessagingTransport | null} */
let sharedTransport = null;

/**
 * The extension's single channel to the native app, shared by every `NativeMessaging` instance, like C-S-S's
 * shared Android messaging config.
 *
 * Requests and notifications use `browser.runtime.sendNativeMessage`, not `browser.runtime.connectNative`, because
 * that is unreliable: see https://app.asana.com/1/137249556945/task/1212463850466010/comment/1213200228981366?focus=true
 *
 * Subscriptions can't use a port either, because a port is lost when the service worker sleeps, and native has no
 * API to push data into the background. Instead, native queues subscription events in an outbox and performs
 * `NATIVE_EVENT_COMMAND`, which wakes the background if needed. The transport then pulls the queued events with a
 * `drainEvents` request and routes each one to the subscribers for its feature and subscription name. It also
 * drains once at startup, for events queued while the extension was not loaded. Native keeps only the latest event
 * per subscription, so a subscription delivers state, not history, and delivery is at most once.
 *
 * There must be only one transport, because the first drain empties the outbox for every feature. Use
 * `NativeMessagingTransport.shared()`.
 */
export class NativeMessagingTransport {
    /**
     * The transport, created on first use. `NativeMessaging` instances are created during the background's first
     * turn, so this registers the command listener in time for WebKit to wake the background for it.
     * @returns {NativeMessagingTransport}
     */
    static shared() {
        return sharedTransport ?? new NativeMessagingTransport();
    }

    /**
     * Forgets the shared transport, so tests can create a fresh one.
     */
    static resetSharedForTesting() {
        sharedTransport = null;
    }

    /**
     * @param {object} [options]
     * @param {string} [options.appId]
     * @param {CommandsApi | undefined} [options.commands] - defaults to `browser.commands`
     * @param {SendNativeMessage} [options.sendNativeMessage] - defaults to `browser.runtime.sendNativeMessage`
     */
    constructor({
        appId = DEFAULT_NATIVE_APP_ID,
        commands = browser.commands,
        sendNativeMessage = (id, message) => browser.runtime.sendNativeMessage(id, message),
    } = {}) {
        if (sharedTransport) {
            throw new Error('NativeMessagingTransport already exists: use NativeMessagingTransport.shared()');
        }
        sharedTransport = this;
        this._appId = appId;
        this._sendNativeMessage = sendNativeMessage;
        /** @type {Map<string, Set<(params: Record<string, any>) => void>>} */
        this._subscriptions = new Map();
        /** @type {Promise<void> | null} */
        this._draining = null;
        this._drainRequested = false;

        // Registered synchronously, so WebKit records it and wakes the background for later commands.
        commands?.onCommand.addListener((command) => {
            if (command === NATIVE_EVENT_COMMAND) {
                this.drain();
            }
        });
        // Runs after the current turn, once the background's top-level code has subscribed.
        this.ready = Promise.resolve().then(() => this.drain());
    }

    /**
     * @param {NotificationMessage} msg
     */
    async notify(msg) {
        DEBUG && console.log('[NativeMessaging] NOTIFY', `${msg.context}.${msg.featureName}.${msg.method}`, msg.params);
        await this._sendNativeMessage(this._appId, msg).catch((e) => {
            DEBUG && console.error('[NativeMessaging] notification error:', e);
            throw e;
        });
    }

    /**
     * @param {RequestMessage} msg
     * @returns {Promise<any>} the response's result
     */
    async request(msg) {
        const { context, featureName, method, id, params } = msg;
        DEBUG && console.log('[NativeMessaging] REQUEST', `${context}.${featureName}.${method}`, `id=${id}`, params);

        const response = /** @type {MessageResponse} */ (
            await this._sendNativeMessage(this._appId, msg).catch((e) => {
                DEBUG && console.error('[NativeMessaging] error:', e);
                return {
                    id,
                    context,
                    featureName,
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

    /**
     * @param {Subscription} msg
     * @param {(params: Record<string, any>) => void} callback
     * @returns {() => void} removes the listener
     */
    subscribe(msg, callback) {
        const key = `${msg.featureName}.${msg.subscriptionName}`;
        let listeners = this._subscriptions.get(key);
        if (!listeners) {
            listeners = new Set();
            this._subscriptions.set(key, listeners);
        }
        listeners.add(callback);
        return () => listeners.delete(callback);
    }

    /**
     * Pulls queued subscription events from native and dispatches them. Concurrent calls share one pull; a call made
     * during a pull schedules one more, so events queued mid-pull are not left waiting for the next command.
     * @returns {Promise<void>}
     */
    drain() {
        if (this._draining) {
            this._drainRequested = true;
            return this._draining;
        }
        this._draining = (async () => {
            try {
                do {
                    this._drainRequested = false;
                    await this._drainOnce();
                } while (this._drainRequested);
            } finally {
                this._draining = null;
            }
        })();
        return this._draining;
    }

    async _drainOnce() {
        let result;
        try {
            result = await this.request({
                context: NATIVE_EVENTS_CONTEXT,
                featureName: NATIVE_EVENTS_FEATURE,
                method: 'drainEvents',
                id: crypto.randomUUID(),
                params: {},
            });
        } catch (e) {
            console.error('NativeMessagingTransport: failed to pull events', e);
            return;
        }
        const events = Array.isArray(result?.events) ? result.events : [];
        for (const event of events) {
            this._dispatch(event);
        }
    }

    /**
     * @param {NativeSubscriptionEvent} event
     */
    _dispatch(event) {
        const listeners = this._subscriptions.get(`${event?.featureName}.${event?.subscriptionName}`);
        if (!listeners) {
            DEBUG && console.log('[NativeMessaging] no subscriber for event', event);
            return;
        }
        for (const listener of listeners) {
            try {
                listener(event.params ?? {});
            } catch (e) {
                console.error('NativeMessagingTransport: subscriber failed', e);
            }
        }
    }
}

/**
 * Messaging for one feature's communication with the native app. It mimics the C-S-S messaging API, and sends
 * everything through the shared `NativeMessagingTransport`.
 *
 * Subscribe during the background's first turn, like any other extension event listener: WebKit only wakes a
 * sleeping background for events that had a listener when it last ran.
 *
 * @implements {NativeMessagingInterface}
 */
export default class NativeMessaging {
    /**
     * @param {string} context
     * @param {string} featureName
     * @param {object} [options]
     * @param {NativeMessagingTransport} [options.transport] - defaults to `NativeMessagingTransport.shared()`
     */
    constructor(context, featureName, { transport = NativeMessagingTransport.shared() } = {}) {
        this._context = context;
        this._featureName = featureName;
        this._transport = transport;
    }

    /**
     * Send a fire-and-forget notification to the native app.
     *
     * @param {string} method - The method name to call on the native side
     * @param {Record<string, any>} [params] - Optional parameters to send
     */
    async notify(method, params = {}) {
        await this._transport.notify(
            /** @type {NotificationMessage} */ ({ context: this._context, featureName: this._featureName, method, params }),
        );
    }

    /**
     * Send a request to the native app and wait for a response.
     *
     * @param {string} method - The method name to call on the native side
     * @param {Record<string, any>} [params] - Optional parameters to send
     * @returns {Promise<any>}
     */
    async request(method, params = {}) {
        return this._transport.request(
            /** @type {RequestMessage} */ ({
                context: this._context,
                featureName: this._featureName,
                id: crypto.randomUUID(),
                method,
                params,
            }),
        );
    }

    /**
     * Listen for subscription events native sends for this feature.
     *
     * @param {string} subscriptionName
     * @param {(params: Record<string, any>) => void} callback
     * @returns {() => void} removes the listener
     */
    subscribe(subscriptionName, callback) {
        return this._transport.subscribe(
            /** @type {Subscription} */ ({ context: this._context, featureName: this._featureName, subscriptionName }),
            callback,
        );
    }
}
