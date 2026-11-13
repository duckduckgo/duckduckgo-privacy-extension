import AutoConsent from '@duckduckgo/autoconsent';

/**
 * Fire-and-forget progress mark for the background. Must never delay init or throw.
 * @param {string} stage
 */
function reportInitProgress(stage) {
    try {
        chrome.runtime
            .sendMessage({
                messageType: 'autoconsent',
                autoconsentPayload: { type: 'cpmInitProgress', stage },
            })
            .catch(() => {});
    } catch (e) {
        // marks are best effort
    }
}

// The background replies to init and eval with the response to the message, so there is no runtime.onMessage
// listener here: WebKit keeps a frame whose content script has one alive after the page removes the frame.
const consent = new AutoConsent(async (msg) => {
    if (msg.type === 'init' && window === window.top) {
        reportInitProgress('page_init_sent');
    }
    const response = await chrome.runtime.sendMessage({
        messageType: 'autoconsent',
        autoconsentPayload: msg,
    });
    if (response) {
        await consent.receiveMessageCallback(response);
    }
});
