const allowedMessages = [
    'getClickToLoadState',
    'getYouTubeVideoDetails',
    'openShareFeedbackPage',
    'setYoutubePreviewsEnabled',
    'unblockClickToLoadContent',
    'updateYouTubeCTLAddedFlag'
]

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

    // Content-scope-script messaging proxy, to allow the Click to Load content
    // script to send messages to the extension's background and receive a
    // response.
    // Note: This event listener is only for Chrome MV3 builds of the extension,
    //       the equivalent Chrome MV2 event listener lives in
    //       content-scope-scripts/inject/chrome.js.
    window.addEventListener('sendMessageProxy' + secret, event => {
        event.stopImmediatePropagation()

        if (!(event instanceof CustomEvent) || !event?.detail) {
            return console.warn('no details in sendMessage proxy', event)
        }

        const messageType = event.detail?.messageType
        if (!allowedMessages.includes(messageType)) {
            return console.warn('Ignoring invalid sendMessage messageType', messageType)
        }

        chrome.runtime.sendMessage(event.detail, response => {
            const message = {
                type: 'update',
                messageType: 'response',
                responseMessageType: messageType,
                response
            }

            window.dispatchEvent(new CustomEvent(secret, {
                detail: message
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
