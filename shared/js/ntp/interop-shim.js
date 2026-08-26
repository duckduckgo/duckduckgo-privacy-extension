/**
 * Windows interop shim for the embedded New Tab Page.
 *
 * The New Tab Page (from @duckduckgo/content-scope-scripts) is built for the
 * 'windows' platform, so its messaging layer expects the native browser to
 * provide `windowsInteropPostMessage`, `windowsInteropAddEventListener` and
 * `windowsInteropRemoveEventListener` globals (normally backed by
 * `window.chrome.webview`).
 *
 * In the chromium-embedded build the page is served as an extension page
 * instead, so this script - loaded before the page's own scripts - provides
 * those globals, bridging messages to the background over a runtime port. The
 * page's own transport correlates requests/responses by `id` and subscription
 * events by `subscriptionName`, so this shim only needs to pipe messages
 * through in both directions. See
 * shared/js/background/components/ntp-messaging.js for the background side.
 *
 * This is a PoC arrangement: longer term the content-scope-scripts build
 * should gain a first-class extension messaging target instead.
 */
import { NTP_PORT_NAME } from './constants.js';

/** @type {Set<(event: { data: any }) => void>} */
const messageHandlers = new Set();

/** @type {chrome.runtime.Port?} */
let port = null;

function connect() {
    port = chrome.runtime.connect({ name: NTP_PORT_NAME });
    port.onMessage.addListener((msg) => {
        // Synthetic MessageEvent: the page's transport only reads `data`, and
        // requires `origin` to be null/undefined (as with WebView2 events).
        for (const handler of messageHandlers) {
            handler({ data: msg });
        }
    });
    // The port disconnects if the background service worker shuts down;
    // reconnect lazily on the next outgoing message.
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
