/**
 * @typedef {import('webextension-polyfill').Runtime.Port} Port
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').IncomingExtensionMessage} OutgoingPopupMessage
 */

// Messaging connection with the popup UI (when active).
/** @type {Port?} */
let activePort = null;

export function getActivePort() {
    return activePort;
}

/**
 *
 * @param {Port?} port
 */
export function setActivePort(port) {
    activePort = port;
}

/**
 * Post a message to the popup UI, if it's open.
 *
 * @param {OutgoingPopupMessage} message
 */
export function postPopupMessage(message) {
    activePort?.postMessage(message);
}
