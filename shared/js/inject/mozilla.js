/* global protections */

function init () {
    protections.loadProtections()

    chrome.runtime.sendMessage({ registeredContentScript: true },
        (message) => {
            // Background has disabled protections
            if (!message) {
                return
            }
            protections.initProtections(message)
        }
    )
}

init()
