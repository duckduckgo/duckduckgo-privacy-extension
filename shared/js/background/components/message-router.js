import browser from 'webextension-polyfill';

import messageHandlers from '../message-handlers';
import { getExtensionId } from '../wrapper';
import { getBrowserName } from '../utils';

/**
 * @typedef {import('webextension-polyfill').Runtime.Port} Port
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').IncomingExtensionMessage} OutgoingPopupMessage
 */

export class MessageReceivedEvent extends CustomEvent {
    constructor(msg) {
        super('messageReceived', { detail: msg });
    }

    get messageType() {
        return this.detail.messageType;
    }
}

/** @type {Port?} */
let activePort = null;

export default class MessageRouter extends EventTarget {
    constructor({ tabManager }) {
        super();
        const browserName = getBrowserName();
        // Handle popup UI (aka privacy dashboard) messaging.
        browser.runtime.onConnect.addListener((port) => {
            if (port.name === 'privacy-dashboard') {
                this.popupConnectionOpened(port);
            }
        });

        // Handle any messages that come from content/UI scripts
        browser.runtime.onMessage.addListener((req, sender) => {
            if (sender.id !== getExtensionId()) return;

            // TODO clean up message passing
            const legacyMessageTypes = [
                'addUserData',
                'getUserData',
                'removeUserData',
                'getEmailProtectionCapabilities',
                'getAddresses',
                'refreshAlias',
                'debuggerMessage',
            ];
            for (const legacyMessageType of legacyMessageTypes) {
                if (legacyMessageType in req) {
                    req.messageType = legacyMessageType;
                    req.options = req[legacyMessageType];
                }
            }

            if (req.registeredTempAutofillContentScript) {
                req.messageType = 'registeredContentScript';
            }

            if (req.messageType && req.messageType in messageHandlers) {
                this.dispatchEvent(new MessageReceivedEvent(req));
                return Promise.resolve(messageHandlers[req.messageType](req.options, sender, req));
            }

            // Count refreshes per page
            if (req.pageReloaded && sender.tab !== undefined) {
                const tab = tabManager.get({ tabId: sender.tab.id });
                if (tab) {
                    tab.userRefreshCount += 1;
                }
                return;
            }

            // TODO clean up legacy onboarding messaging
            if (browserName === 'chrome') {
                if (req === 'healthCheckRequest' || req === 'rescheduleCounterMessagingRequest') {
                    return;
                }
            }

            console.error('Unrecognized message to background:', req, sender);
        });
    }

    /**
     * Set up the messaging connection with the popup UI.
     *
     * Note: If the ServiceWorker dies while there is an open connection, the popup
     *       will take care of re-opening the connection.
     *
     * @param {Port} port
     */
    popupConnectionOpened(port) {
        activePort = port;
        port.onDisconnect.addListener(() => {
            if (activePort === port) {
                activePort = null;
            }
        });

        port.onMessage.addListener(async (message) => {
            const messageType = message?.messageType;

            if (!messageType || !(messageType in messageHandlers)) {
                console.error('Unrecognized message (privacy-dashboard -> background):', message);
                return;
            }
            this.dispatchEvent(new MessageReceivedEvent(message));

            const response = await messageHandlers[messageType](message?.options, port, message);
            if (typeof message?.id === 'number') {
                port.postMessage({
                    id: message.id,
                    messageType: 'response',
                    options: response,
                });
            }
        });
    }
}

/**
 * Post a message to the popup UI, if it's open.
 *
 * @param {OutgoingPopupMessage} message
 */
export function postPopupMessage(message) {
    activePort?.postMessage(message);
}
