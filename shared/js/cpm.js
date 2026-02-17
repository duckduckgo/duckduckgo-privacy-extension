import AutoConsent from '@duckduckgo/autoconsent';

const consent = new AutoConsent(async (msg) => {
    await chrome.runtime.sendMessage({
        messageType: 'autoconsent',
        autoconsentPayload: msg,
    });
});

chrome.runtime.onMessage.addListener((message) => {
    return Promise.resolve(consent.receiveMessageCallback(message));
});
