import constants from '../../data/constants'
console.log('✅ PAGE LOAD `newtab.js`')
const { events, allowedOrigin } = constants.trackerStats

/**
 * Because this JS file is loaded into an iframe with access to `window.chrome.runtime`
 * we use it to forward data into the parent page. In this case that
 * would be the *remote* new tab page.
 */
window.chrome.runtime.onMessage.addListener(msg => {
    // check we're only sending known outgoing messages
    if (msg.messageType in events.outgoing) {
        console.log('📤 OUTGOING newtab.js', msg)
        window.parent.postMessage(msg, allowedOrigin)
    }
})

/**
 * When the iframe loads, always initialize an initial read
 */
window.chrome.runtime.sendMessage({ messageType: events.incoming.newTabPage_readInitial })

/**
 * Listen for incoming messages from the New Tab Page and forward them
 * into the extension if they are valid
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
    window.chrome.runtime.sendMessage(e.data)
})
