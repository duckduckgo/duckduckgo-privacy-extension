/**
 * @typedef {import('webextension-polyfill').Runtime.Port} Port
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').IncomingExtensionMessage} OutgoingPopupMessage
 */

// Messaging connection with the popup UI (when active).
/** @type {Port?} */
let activePort = null

/**
 * Set up the messaging connection with the popup UI.
 *
 * Note: If the ServiceWorker dies while there is an open connection, the popup
 *       will take care of re-opening the connection.
 *
 * @param {Port} port
 * @param {Record<
 *     string,
 *     (options: any, sender: any, message: any) => any
 * >} messageHandlers
 */
export function popupConnectionOpened(port, messageHandlers) {
    activePort = port
    port.onDisconnect.addListener(() => {
        if (activePort === port) {
            activePort = null
        }
    })

    port.onMessage.addListener(async (message) => {
        const messageType = message?.messageType

        if (!messageType || !(messageType in messageHandlers)) {
            console.error('Unrecognized message (privacy-dashboard -> background):', message)
            return
        }

        const response = await messageHandlers[messageType](message?.options, port, message)
        if (typeof message?.id === 'number') {
            port.postMessage({
                id: message.id,
                messageType: 'response',
                options: response,
            })
        }
    })
}

/**
 * Post a message to the popup UI, if it's open.
 *
 * @param {OutgoingPopupMessage} message
 */
export function postPopupMessage(message) {
    activePort?.postMessage(message)
}
