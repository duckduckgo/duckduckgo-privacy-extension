/** @module extensionDetection */
const { generateDNRRule } = require('./utils');

const EXTENSION_DETECTION_HEADER_PRIORITY = 40000;

/**
 * Generate a declarativeNetRequest rule to add a header that allows the
 * DuckDuckGo backend to detect this extension is installed.
 * @param {number} ruleId
 * @param {string} extensionVersion
 * @return {chrome.declarativeNetRequest.Rule}
 */
function generateExtensionDetectionHeaderRule(ruleId, extensionVersion) {
    return generateDNRRule({
        id: ruleId,
        priority: EXTENSION_DETECTION_HEADER_PRIORITY,
        actionType: 'modifyHeaders',
        requestHeaders: [
            { header: 'X-DuckDuckGo-Extension', operation: 'set', value: extensionVersion },
        ],
        resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest'],
        requestDomains: ['duckduckgo.com'],
    });
}

exports.EXTENSION_DETECTION_HEADER_PRIORITY = EXTENSION_DETECTION_HEADER_PRIORITY;
exports.generateExtensionDetectionHeaderRule = generateExtensionDetectionHeaderRule;
