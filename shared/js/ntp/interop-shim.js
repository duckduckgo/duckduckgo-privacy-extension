/**
 * Provides the `windowsInterop*` globals the New Tab Page's 'windows'
 * messaging transport expects, bridged to the background over a runtime port
 * (see shared/js/background/components/ntp-messaging.js). Must load before
 * the page's own scripts.
 */
import { NTP_PORT_NAME, NTP_RECONNECT_MESSAGE } from './constants.js';

/** @type {Set<(event: { data: any }) => void>} */
const messageHandlers = new Set();

/**
 * Requests not yet answered, by Id. Re-sent on reconnect.
 * @type {Map<string, any>}
 */
const pendingRequests = new Map();

/** @type {chrome.runtime.Port?} */
let port = null;

function connect() {
    port = chrome.runtime.connect({ name: NTP_PORT_NAME });
    port.onMessage.addListener((msg) => {
        pendingRequests.delete(msg.id);
        // The transport only reads `data`, and requires `origin` to be unset.
        for (const handler of messageHandlers) {
            handler({ data: msg });
        }
    });
    // The port closes when the service worker stops. Reconnect straight away only to
    // re-send unanswered requests; otherwise on the next outgoing message, or when the
    // background asks on startup.
    port.onDisconnect.addListener(() => {
        port = null;
        if (pendingRequests.size > 0) {
            connect();
        }
    });
    for (const msg of pendingRequests.values()) {
        port.postMessage(msg);
    }
}

globalThis.windowsInteropPostMessage = (msg) => {
    if (!port) {
        connect();
    }
    if (msg.Id) {
        pendingRequests.set(msg.Id, msg);
    }
    port?.postMessage(msg);
};

globalThis.windowsInteropAddEventListener = (_name, handler) => {
    messageHandlers.add(handler);
};

globalThis.windowsInteropRemoveEventListener = (_name, handler) => {
    messageHandlers.delete(handler);
};

chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.[NTP_RECONNECT_MESSAGE] && !port) {
        connect();
    }
});

connect();
