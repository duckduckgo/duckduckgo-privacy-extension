/**
 * Provides the `windowsInterop*` globals the New Tab Page's 'windows'
 * messaging transport expects, bridged to the background over a runtime port
 * (see shared/js/background/components/ntp-messaging.js). Must load before
 * the page's own scripts.
 */
import { NTP_PORT_NAME } from './constants.js';

/** @type {Set<(event: { data: any }) => void>} */
const messageHandlers = new Set();

/** @type {chrome.runtime.Port?} */
let port = null;

function connect() {
    port = chrome.runtime.connect({ name: NTP_PORT_NAME });
    port.onMessage.addListener((msg) => {
        // The transport only reads `data`, and requires `origin` to be unset.
        for (const handler of messageHandlers) {
            handler({ data: msg });
        }
    });
    // The port closes when the service worker stops; reconnect on the next outgoing message.
    port.onDisconnect.addListener(() => {
        port = null;
    });
}

globalThis.windowsInteropPostMessage = (msg) => {
    if (!port) {
        connect();
    }
    port?.postMessage(msg);
};

globalThis.windowsInteropAddEventListener = (_name, handler) => {
    messageHandlers.add(handler);
};

globalThis.windowsInteropRemoveEventListener = (_name, handler) => {
    messageHandlers.delete(handler);
};

connect();
