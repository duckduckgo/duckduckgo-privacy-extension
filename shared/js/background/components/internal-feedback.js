import { registerMessageHandler } from '../message-registry';

/**
 * Ask the browser for a reply to the internal feedback form.
 *
 * Only the top frame of a tab can ask, and the browser answers only when that
 * tab shows the form. Anything else, including a browser without the method,
 * gets the fallback.
 *
 * @template T
 * @param {'getInternalFeedbackDeviceInfo' | 'getInternalFeedbackAttachments'} method
 * @param {chrome.runtime.MessageSender} sender
 * @param {T} fallback
 */
export async function askBrowser(method, sender, fallback) {
    const tabId = sender.tab?.id;
    if (tabId === undefined || sender.frameId !== 0) {
        return fallback;
    }
    try {
        return (await chrome.ddg?.[method]?.(tabId)) ?? fallback;
    } catch (e) {
        console.warn(`internal feedback ${method} refused:`, e);
        return fallback;
    }
}

/**
 * Answer the internal feedback form's requests, which content-scope-scripts'
 * message bridge relays from the page.
 */
export default function setupInternalFeedback() {
    registerMessageHandler('getDeviceInfo', (options, sender) => askBrowser('getInternalFeedbackDeviceInfo', sender, undefined));
    registerMessageHandler('getAttachments', (options, sender) => askBrowser('getInternalFeedbackAttachments', sender, {}));
}
