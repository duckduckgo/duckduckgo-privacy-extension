function getSecret () {
    return new Promise(resolve => {
        window.addEventListener('ddg-secret', event => {
            event.stopImmediatePropagation()
            resolve(event.detail)
        }, { once: true })
    })
}

async function init () {
    const secret = await getSecret()

    chrome.runtime.onMessage.addListener((message) => {
        window.dispatchEvent(new CustomEvent(secret, {
            detail: message
        }))
    })

    chrome.runtime.sendMessage({
        messageType: 'registeredContentScript',
        options: {
            documentUrl: window.location.href
        }
    }, argumentsObject => {
        // Setup debugging messages if necessary.
        if (argumentsObject.debug) {
            window.addEventListener('message', message => {
                if (message.data.action && message.data.message) {
                    chrome.runtime.sendMessage({
                        messageType: 'debuggerMessage',
                        options: message.data
                    })
                }
            })
        }

        // Init the content-scope-scripts with the argumentsObject.
        window.dispatchEvent(new CustomEvent(secret, {
            detail: {
                type: 'register',
                argumentsObject
            }
        }))
    })
}

init()
