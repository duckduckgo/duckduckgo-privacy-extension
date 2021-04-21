/* global protections */

function init () {
    chrome.runtime.sendMessage({ registeredContentScript: true },
        (message) => {
            // Background has disabled protections
            if (!message) {
                return
            }
            protections.initProtection(message)
        }
    )
}

init()
