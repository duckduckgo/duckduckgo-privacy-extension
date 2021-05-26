/* global protections */

function init () {
    protections.loadProtections()

    chrome.runtime.sendMessage({
        registeredContentScript: true,
        documentUrl: window.location.href
    },
    (message) => {
        // Background has disabled protections
        if (!message) {
            return
        }
        if (message.debug) {
            window.addEventListener('message', (m) => {
                if (m.data.action && m.data.message) {
                    chrome.runtime.sendMessage({
                        debuggerMessage: m.data
                    })
                }
            })
        }
        protections.initProtections(message)
    }
    )

    chrome.runtime.onMessage.addListener((message) => {
        // forward update messages to the embedded script
        if (message && message.type === 'update') {
            protections.updateProtections(message)
        }
    })
}

init()
