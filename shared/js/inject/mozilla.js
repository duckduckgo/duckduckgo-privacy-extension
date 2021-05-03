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
