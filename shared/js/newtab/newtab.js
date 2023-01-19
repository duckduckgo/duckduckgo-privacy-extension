import constants from '../../data/constants'
import { outgoing, incoming } from './schema'
const { events, allowedOrigin } = constants.trackerStats

/**
 * A flag to ensure we're not doing work until we've received a trusted event
 * It's initiall set to false, meaning we're inactive.
 *
 * Once a single `postMessage` is received from the allow-listed origin we
 * will flip this switch and allow communications with the extension to continue
 *
 * @type {boolean}
 */
let listening = false

/**
 * Establish the connection with the extension, but not initially.
 */
function listenToChromeRuntimeMessages () {
    listening = true
    /**
     * Because this JS file is loaded into an iframe with access to `window.chrome.runtime`
     * we use it to forward data into the parent page. In this case that
     * would be the *remote* new tab page.
     */
    window.chrome.runtime.onMessage.addListener(msg => {
        // check we're only sending known outgoing messages
        if (msg.messageType in events.outgoing) {
            sendToNewTabPage(msg)
        }
    })
}

/**
 * Listen for incoming messages from the New Tab Page and forward them
 * into the extension if they are valid.
 */
window.addEventListener('message', (e) => {
    if (!e.isTrusted || e.origin !== constants.trackerStats.allowedOrigin) {
        // ignore messages from any domain that we have not explicitly allowed
        console.error('this message or origin was not trusted', e.data)
        return
    }

    if (typeof e.data?.messageType !== 'string') {
        console.error('unknown message format. required: { messageType: ... } ', e.data)
        return
    }

    if (!(e.data.messageType in events.incoming)) {
        console.error('unknown message type, ignoring', e.data)
        return
    }

    // if we get this far, it's a valid message that we can forward into the Extension
    console.log('📩 INCOMING newtab.js', e.data)
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
 * @param {import("zod").infer<incoming>} msg
 */
function sendToChromeRuntime (msg) {
    // If we get here and we're not currently listening to internal events, flip the
    // switch and start listening
    if (!listening) {
        listenToChromeRuntimeMessages()
    }

    // now ensure the event is valid
    const parsed = incoming.safeParse(msg)
    if (!parsed.success) {
        console.warn('not forwarding to the chrome runtime because validation failed for:', msg)
        return console.error(parsed.error)
    }

    /**
     * Now send the message as normal
     */
    try {
        window.chrome.runtime.sendMessage(parsed.data)
    } catch (e) {
        console.error('could not access `window.chrome.runtime.sendMessage`', e)
        sendToNewTabPage({ messageType: events.outgoing.newTabPage_disconnect })
    }
}
