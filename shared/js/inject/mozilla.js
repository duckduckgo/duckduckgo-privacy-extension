SCRIPT_TO_REPLACE

function init () {
    chrome.runtime.sendMessage({ registeredContentScript: true },
        (message) => {
            protections.initProtection(message)
        }
    )
}

init()
