import AutoConsent from '@duckduckgo/autoconsent';

const consent = new AutoConsent(async (msg) => {
    const response = await chrome.runtime.sendMessage({
        messageType: 'autoconsent',
        ...msg,
    });
    if (response) {
        consent.receiveMessageCallback(response);
    }
});

chrome.runtime.onMessage.addListener((message) => {
    return Promise.resolve(consent.receiveMessageCallback(message));
});