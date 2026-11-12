import AutoConsent from '@duckduckgo/autoconsent';

// The background replies to init and eval with the response to the message, so there is no runtime.onMessage
// listener here: WebKit keeps a frame whose content script has one alive after the page removes the frame.
const consent = new AutoConsent(async (msg) => {
    const response = await chrome.runtime.sendMessage({
        messageType: 'autoconsent',
        autoconsentPayload: msg,
    });
    if (response) {
        await consent.receiveMessageCallback(response);
    }
});
