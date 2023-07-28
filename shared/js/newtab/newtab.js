import constants from '../../data/constants'
import { incoming, outgoing } from './schema'
const { events, allowedOrigin, clientPortName } = constants.trackerStats

/**
 * A flag to ensure we're not doing work until we've received a trusted event
 * It's initially set to false, meaning we're inactive.
 *
 * Once a single `postMessage` is received from the allow-listed origin we
 * will flip this switch and allow communications with the extension to continue
 *
 * @type {boolean}
 */
let receivedMessageFromAllowedOrigin = false

/**
 * Establish the connection with the extension, but not initially.
 *
 * Because this JS file is loaded into an iframe with access to `window.chrome.runtime`
 * we use it to forward data into the parent page.
 */
function connect () {
    const port = chrome.runtime.connect({ name: clientPortName })

    port.onMessage.addListener((msg) => {
        if (msg.messageType in events.outgoing) {
            sendToNewTabPage(msg)
        }
    })

    port.onDisconnect.addListener((msg) => {
        console.log('🚨 PORT onDisconnect', msg)
    })

    return port
}

/**
 * Listen for incoming messages from the New Tab Page and forward them
 * into the extension if they are valid.
 */
window.addEventListener('message', (e) => {
    if (!e.isTrusted || e.origin !== constants.trackerStats.allowedOrigin) {
        // ignore messages from any domain that we have not explicitly allowed
        console.error('this event was not trusted:', e)
        return
    }

    // if we get here, we've observed a trusted event
    receivedMessageFromAllowedOrigin = true

    if (typeof e.data?.messageType !== 'string') {
        console.error('unknown message format. required: { messageType: ... } ', e.data)
        return
    }

    if (!(e.data.messageType in events.incoming)) {
        console.error('unknown message type, ignoring', e.data)
        return
    }

    // if we get this far, it's a valid message that we can forward into the Extension
    // console.log('📩 INCOMING newtab.js', e.data)
    sendToChromeRuntime(e.data)
})

/**
 * Send a message the allowedOrigin
 *
 * This is the 'boundary' so there's an extra validation step
 * here to ensure we're only sending well-known data to the
 * new tab page.
 *
 * This allows developers to come here and read the schemas to figure out what data
 * will be sent.
 *
 * @param {import("zod").infer<outgoing>} msg
 */
function sendToNewTabPage (msg) {
    // try to validate the message
    const parsed = outgoing.safeParse(msg)
    if (!parsed.success) {
        console.warn('not forwarding as validation failed on', msg)
        return console.error(parsed.error)
    }

    // if we get here, we're sure it's a known message and we attempt to ping
    // it up into the parent frame.
    if (typeof window.parent?.postMessage === 'function') {
        window.parent.postMessage(parsed.data, allowedOrigin)
    } else {
        console.error('lost connection to window.parent')
    }
}

/**
 * A single place to try/catch around sending messages back to the extension
 *
 * During testing I realised that every method on chrome.runtime.* can throw at some point,
 * so we take a straight-forward approach to errors. Any communication error found here
 * will result in the NTP receiving a 'disconnect' message so that it can remove its UI
 *
 * @param {import("zod").infer<incoming>} msg
 */
let port = null
function sendToChromeRuntime (msg) {
    if (!receivedMessageFromAllowedOrigin) return
    try {
        // If we get here and we're not currently listening to internal events, flip the
        // switch and start listening
        if (!port) {
            port = connect()
        }

        // now ensure the event is valid
        const parsed = incoming.safeParse(msg)
        if (!parsed.success) {
            console.warn('not forwarding to the chrome runtime because validation failed for:', msg)
            return console.error(parsed.error)
        }

        /**
         * send the message as normal now
         */
        port.postMessage(parsed.data)
    } catch (e) {
        console.error('could not connect to, or send to `port.postMessage`', e)
        sendToNewTabPage({ messageType: events.outgoing.newTabPage_disconnect })
    }
}
