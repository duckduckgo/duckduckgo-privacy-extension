import browser from 'webextension-polyfill';

/**
 * @typedef {import('webextension-polyfill').Runtime.Port} Port
 * @typedef {import("@duckduckgo/content-scope-scripts/messaging").RequestMessage} RequestMessage
 * @typedef {import("@duckduckgo/content-scope-scripts/messaging").NotificationMessage} NotificationMessage
 * @typedef {RequestMessage | NotificationMessage} Incoming
 * @typedef {{ tabId: number, documentId: string }} PushTarget
 */

export class InjectedMessaging {
    constructor() {
        browser.runtime.onConnect.addListener((port) => {
            if (port.name !== 'injected') return;
            port.onMessage.addListener((msg) => {
                this.onMessage(this.toMsg(msg), port);
            });
        });
        // Registered at startup so a push from the browser wakes the service worker.
        chrome.ddg?.onBridgeMessage?.addListener((push) => {
            const { tabId, documentId, featureName, subscriptionName, params } = push;
            this.deliverPush([{ tabId, documentId }], { context: 'contentScopeScripts', featureName, subscriptionName, params });
        });
    }

    /**
     * Whether the browser answers bridge messages itself.
     * @returns {boolean}
     */
    get browserHandlesMessages() {
        return typeof chrome.ddg?.sendBridgeMessage === 'function';
    }

    /**
     * Answers a request: from the browser when it handles bridge messages, otherwise locally.
     * @param {Port} port
     * @param {Incoming} msg
     */
    async answer(port, msg) {
        const { featureName, method, params } = msg;
        const ddg = chrome.ddg;
        if (!ddg?.sendBridgeMessage) {
            return this._getResponse(featureName, method, params);
        }
        const id = 'id' in msg ? msg.id : undefined;
        return ddg.sendBridgeMessage(port.sender?.documentId, { featureName, method, id, params });
    }

    /**
     * Posts to a page's port, dropping the message quietly when the page has already gone.
     * @param {Port} port
     * @param {object} message
     */
    postIfOpen(port, message) {
        try {
            port.postMessage(message);
        } catch {
            // The port closed because the page navigated or was closed.
        }
    }

    /**
     * @param {unknown} incoming
     * @return {Incoming}
     */
    toMsg(incoming) {
        return /** @type {Incoming} */ (incoming);
    }

    /**
     * @param {Incoming} msg
     * @param {Port} port
     */
    async onMessage(msg, port) {
        const { context, featureName, method, params } = msg;
        if ('id' in msg) {
            try {
                const result = await this.answer(port, msg);
                // An empty result is answered with `{}`, per the messaging implementation guide.
                this.postIfOpen(port, { context, featureName, id: msg.id, result: result ?? {} });
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                this.postIfOpen(port, { context, featureName, id: msg.id, error: { message } });
            }
        } else {
            try {
                if (this.browserHandlesMessages) {
                    await this.answer(port, msg);
                    return;
                }
                await this.handleNotification(method, params, port);
            } catch (e) {
                console.error(`Injected message ${method} failed:`, e);
            }
        }
    }

    /**
     * @param {string} method
     * @param {Record<string, unknown>} [params]
     * @param {Port} [port]
     */
    async handleNotification(method, params, port) {}

    /**
     * Push a subscription event to the named documents. Uses tabs.sendMessage because ports close whenever
     * the service worker stops; `documentId` pins each send, so Chrome drops it if the tab has navigated since.
     * @param {PushTarget[]} targets
     * @param {{ context: string, featureName: string, subscriptionName: string, params?: Record<string, unknown> }} msg
     */
    async deliverPush(targets, msg) {
        await Promise.allSettled(targets.map(({ tabId, documentId }) => browser.tabs.sendMessage(tabId, msg, { documentId })));
    }

    /**
     * @param {string} featureName
     * @param {string} method
     * @param {Record<string, unknown> | undefined} params
     */
    async _getResponse(featureName, method, params) {
        switch (featureName) {
            case 'aiChat': {
                switch (method) {
                    case 'getSyncStatus': {
                        return {
                            ok: true,
                            payload: {
                                syncAvailable: false,
                                userId: null,
                                deviceId: null,
                                deviceName: null,
                                deviceType: null,
                            },
                            reason: null,
                        };
                    }
                    case 'getAIChatNativePrompt': {
                        // No pending prompt from the browser.
                        return null;
                    }
                    case 'getAIChatNativeHandoffData': {
                        return {
                            platform: 'windows',
                            isAIChatHandoffEnabled: false,
                            aiChatPayload: null,
                        };
                    }
                    case 'getAIChatNativeConfigValues': {
                        return {
                            isAIChatHandoffEnabled: true,
                            platform: 'windows',
                            supportsClosingAIChat: true,
                            supportsOpeningSettings: true,
                            supportsNativePrompt: true,
                            supportsNativeChatInput: false,
                            supportsURLChatIDRestoration: false,
                            supportsFullChatRestoration: false,
                            supportsPageContext: true,
                            supportsMultipleContexts: false,
                            supportsStandaloneMigration: false,
                            supportsOpenAIChatLink: true,
                            supportsAIChatSync: true,
                            supportsNativeStorage: false,
                            supportsCanonicalChatFormat: true,
                            supportsTabPicker: false,
                            supportsSuggestions: false,
                            supportsSkills: false,
                            supportsHomePageChatSuggestions: false,
                            supportsAttachmentPrivacyDisplay: false,
                            supportsBonusOffer: false,
                            installType: 'new',
                            installAge: 0,
                        };
                    }
                    case 'reportMetric': {
                        return {};
                    }
                    default: {
                        throw new Error(`Method not found: ${featureName}.${method}`);
                    }
                }
            }
            case 'subscriptions': {
                switch (method) {
                    case 'getAuthAccessToken': {
                        return {};
                    }
                    case 'handshake': {
                        return {
                            availableMessages: [
                                'subscriptionDetails',
                                'getAuthAccessToken',
                                'getFeatureConfig',
                                'backToSettings',
                                'openSubscriptionActivation',
                                'openSubscriptionPurchase',
                                'openSubscriptionUpgrade',
                                'authUpdate',
                            ],
                            platform: 'windows',
                        };
                    }
                    default: {
                        throw new Error(`Method not found: ${featureName}.${method}`);
                    }
                }
            }
            default: {
                throw new Error(`Feature not found: ${featureName}`);
            }
        }
    }
}
