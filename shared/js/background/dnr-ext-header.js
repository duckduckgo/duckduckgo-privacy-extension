import { EXTENSION_DETECTION_HEADER_RULE_ID } from './dnr-utils';
import { getExtensionVersion } from './wrapper';
import { generateExtensionDetectionHeaderRule } from '@duckduckgo/ddg2dnr/lib/extensionDetection';

/**
 * Ensure that the rule to add the extension detection header
 * (X-DuckDuckGo-Extension) is installed as a session rule.
 * This header is only sent with requests to duckduckgo.com so the backend
 * can detect the extension is installed.
 * @return {Promise}
 */
export async function ensureExtensionDetectionHeaderRule() {
    const removeRuleIds = [EXTENSION_DETECTION_HEADER_RULE_ID];
    const addRules = [];

    const extensionVersion = getExtensionVersion();
    addRules.push(
        generateExtensionDetectionHeaderRule(EXTENSION_DETECTION_HEADER_RULE_ID, extensionVersion),
    );

    await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds,
        addRules,
    });
}
