import { registerMessageHandler } from '../message-registry';

/**
 * Whether the remote config enables the internal feedback form's messages on
 * this host. The page can install the message bridge from the bundled config,
 * so this keeps the remote config in control of the data.
 *
 * @param {import('./remote-config').default | undefined} remoteConfig
 * @param {string} hostname
 */
export function isInternalFeedbackEnabled(remoteConfig, hostname) {
    if (!remoteConfig?.isFeatureEnabled('messageBridge')) {
        return false;
    }
    const settings = remoteConfig.getFeatureSettings('messageBridge');
    let state = settings.internalFeedback;
    for (const { domain, patchSettings } of settings.domains ?? []) {
        const domains = Array.isArray(domain) ? domain : [domain];
        if (!domains.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
            continue;
        }
        for (const { op, path, value } of patchSettings ?? []) {
            if (op === 'replace' && path === '/internalFeedback') {
                state = value;
            }
        }
    }
    return state === 'enabled';
}

/**
 * Ask the browser for a reply to the internal feedback form.
 *
 * Only the top frame of a tab can ask, and the browser answers only when that
 * tab shows the form. Anything else, including a browser without the method
 * or a remote config that disables the form's messages, gets the fallback.
 *
 * @template T
 * @param {'getInternalFeedbackDeviceInfo' | 'getInternalFeedbackAttachments'} method
 * @param {chrome.runtime.MessageSender} sender
 * @param {T} fallback
 */
export async function askBrowser(method, sender, fallback) {
    const tabId = sender.tab?.id;
    if (tabId === undefined || sender.frameId !== 0 || !sender.url) {
        return fallback;
    }
    const remoteConfig = globalThis.components?.remoteConfig;
    await remoteConfig?.ready;
    if (!isInternalFeedbackEnabled(remoteConfig, new URL(sender.url).hostname)) {
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
