const allowedMessages = ['openShareFeedbackPage', 'addDebugFlag', 'pageReloaded', 'getBreakageReportValues', 'breakageReportResult'];

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

    // Content-scope-script messaging proxy, to allow content script features to
    // send messages to the extension's background and receive a response.
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

const TAB_DEBUG_ACTIONS = ['get', 'enable', 'disable'];

// Test pages ask through this event to read or change their tab's content-scope-scripts debug flag.
// The background acts on it in developer builds only.
function listenForTabDebugRequests() {
    window.addEventListener('ddgExtensionDebugRequest', (event) => {
        if (!(event instanceof CustomEvent) || typeof event.detail !== 'string') return;
        let action;
        try {
            action = JSON.parse(event.detail).action;
        } catch {
            return;
        }
        if (!TAB_DEBUG_ACTIONS.includes(action)) return;
        chrome.runtime.sendMessage({ messageType: 'tabDebug', options: { action } }, (response) => {
            window.dispatchEvent(
                new CustomEvent('ddgExtensionDebugResponse', { detail: JSON.stringify(response ?? { available: false }) }),
            );
        });
    });
}

listenForTabDebugRequests();
init();
