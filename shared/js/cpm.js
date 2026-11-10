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

const consent = new AutoConsent(async (msg) => {
    if (msg.type === 'init' && window === window.top) {
        reportInitProgress('page_init_sent');
    }
    await chrome.runtime.sendMessage({
        messageType: 'autoconsent',
        autoconsentPayload: msg,
    });
});

chrome.runtime.onMessage.addListener((message) => {
    return Promise.resolve(consent.receiveMessageCallback(message));
});
