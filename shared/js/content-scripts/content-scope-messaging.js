const allowedMessages = [
    'getClickToLoadState',
    'getYouTubeVideoDetails',
    'openShareFeedbackPage',
    'addDebugFlag',
    'setYoutubePreviewsEnabled',
    'unblockClickToLoadContent',
    'updateYouTubeCTLAddedFlag',
    'updateFacebookCTLBreakageFlags',
    'pageReloaded',
];

function getSecret() {
    return new Promise((resolve) => {
        window.addEventListener(
            'ddg-secret',
            (event) => {
                event.stopImmediatePropagation();
                resolve(event.detail);
            },
            { once: true },
        );
    });
}

async function init() {
    const secretPromise = getSecret();

    // send off a message to the background to get config for this frame
    chrome.runtime.sendMessage(
        {
            messageType: 'registeredContentScript',
            options: {
                documentUrl: window.location.href,
            },
        },
        async (argumentsObject) => {
            // Potentially corrupted argumentsObject, don't init
            if (!argumentsObject) return;
            // Setup debugging messages if necessary.
            if (argumentsObject.debug) {
                window.addEventListener('message', (message) => {
                    if (message.data.action && message.data.message) {
                        chrome.runtime.sendMessage({
                            messageType: 'debuggerMessage',
                            options: message.data,
                        });
                    }
                });
            }
            // Legacy support for injecting code into the main world on Chrome MV2 builds.
            if (argumentsObject.code) {
                const scriptTag = document.createElement('script');
                scriptTag.textContent = argumentsObject.code;
                scriptTag.id = 'ddg-content-scope-script';
                (document.head || document.documentElement).appendChild(scriptTag);
                scriptTag.remove();
            }

            // if we didn't get the secret yet, wait for it
            const secret = await secretPromise;
            // Init the content-scope-scripts with the argumentsObject.
            window.dispatchEvent(
                new CustomEvent(secret, {
                    detail: JSON.stringify({
                        type: 'register',
                        argumentsObject,
                    }),
                }),
            );
        },
    );

    const secret = await secretPromise;

    // Content-scope-script messaging proxy, to allow the Click to Load content
    // script to send messages to the extension's background and receive a
    // response.
    // Note: This event listener is only for Chrome MV3 builds of the extension,
    //       the equivalent Chrome MV2 event listener lives in
    //       content-scope-scripts/entry-points/chrome.js.
    window.addEventListener('sendMessageProxy' + secret, (event) => {
        event.stopImmediatePropagation();

        if (!(event instanceof CustomEvent) || !event?.detail) {
            return console.warn('no details in sendMessage proxy', event);
        }

        const eventDetail = JSON.parse(event.detail);
        const messageType = eventDetail.messageType;
        if (!allowedMessages.includes(messageType)) {
            return console.warn('Ignoring invalid sendMessage messageType', messageType);
        }

        chrome.runtime.sendMessage(eventDetail, (response) => {
            const message = {
                type: 'update',
                messageType: 'response',
                responseMessageType: messageType,
                response,
            };

            window.dispatchEvent(
                new CustomEvent(secret, {
                    detail: JSON.stringify(message),
                }),
            );
        });
    });

    chrome.runtime.onMessage.addListener((message) => {
        window.dispatchEvent(
            new CustomEvent(secret, {
                detail: JSON.stringify(message),
            }),
        );
    });
}

init();
