import browser from 'webextension-polyfill';

/**
 * @typedef {import('webextension-polyfill').Runtime.Port} Port
 * @typedef {import("@duckduckgo/content-scope-scripts/messaging").RequestMessage} RequestMessage
 * @typedef {import("@duckduckgo/content-scope-scripts/messaging").NotificationMessage} NotificationMessage
 * @typedef {RequestMessage | NotificationMessage} Incoming
 */

export class InjectedMessaging {
    /** @type {Set<Port>} */
    ports = new Set();

    constructor() {
        browser.runtime.onConnect.addListener((port) => {
            if (port.name !== 'injected') return;
            this.ports.add(port);

            port.onMessage.addListener((msg) => {
                this.onMessage(this.toMsg(msg), port);
            });
            port.onDisconnect.addListener(() => {
                this.ports.delete(port);
            });
        });
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
                const result = await this.forward(port, featureName, method, true, params);
                port.postMessage({ context, featureName, id: msg.id, result });
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                port.postMessage({ context, featureName, id: msg.id, error: { message } });
            }
        } else {
            try {
                await this.forward(port, featureName, method, false, params);
            } catch (e) {
                console.error(`Injected message ${method} failed:`, e);
            }
        }
    }

    /**
     * Passes a message to the browser, which decides what to do with it.
     * @param {Port} port
     * @param {string} featureName
     * @param {string} method
     * @param {boolean} isRequest
     * @param {any} [params]
     */
    async forward(port, featureName, method, isRequest, params) {
        // @ts-ignore - chrome.ddg is not in @types/chrome
        return chrome.ddg.sendBridgeMessage(port.sender?.documentId, featureName, method, isRequest, params);
    }

    /**
     * @param {string} featureName
     * @param {string} method
     * @param {Record<string, unknown>} params
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
                        console.warn('Unhandled injected message', { featureName, method });
                    }
                }
                break;
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
                        console.warn('Unhandled injected message', { featureName, method });
                    }
                }
                break;
            }
            default: {
                console.warn('Unhandled injected message', { featureName, method });
            }
        }
    }
}
