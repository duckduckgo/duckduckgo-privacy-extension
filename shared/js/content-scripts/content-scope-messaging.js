function getSecret () {
    return new Promise(resolve => {
        window.addEventListener('ddg-secret', event => {
            console.warn('secret', event)
            event.stopImmediatePropagation()
            resolve(event.detail)
        }, { once: true })
    })
}

async function init () {
    const secret = await getSecret()

    window.addEventListener('sendMessage' + secret, event => {
        // MV3 message proxy for click to load
        event.stopImmediatePropagation()
        console.warn('received sendMessage for', secret, event)
        const detail = event && event.detail
        if (!detail) {
            console.warn('no details in sendMessage proxy', event)
            return
        }
        chrome.runtime.sendMessage(detail, response => {
            const msg = { type: 'update', detail: { func: detail.messageType, response } }
            window.dispatchEvent(new CustomEvent(secret, {
                detail: msg
            }))
        })
    })

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
