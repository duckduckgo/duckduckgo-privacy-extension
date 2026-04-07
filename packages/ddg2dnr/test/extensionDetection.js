const assert = require('assert');

const {
    generateExtensionDetectionHeaderRule,
    EXTENSION_DETECTION_HEADER_PRIORITY,
} = require('../lib/extensionDetection');

const ruleId = 456;
const extensionVersion = '2026.1.12';

const expectedRule = {
    id: ruleId,
    priority: EXTENSION_DETECTION_HEADER_PRIORITY,
    action: {
        type: 'modifyHeaders',
        requestHeaders: [
            { header: 'X-DuckDuckGo-Extension', operation: 'set', value: extensionVersion },
        ],
    },
    condition: {
        requestDomains: ['duckduckgo.com'],
        resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest'],
    },
};

describe('Extension Detection Header rule', () => {
    it('should generate extension detection header rule correctly', () => {
        const actualRule = generateExtensionDetectionHeaderRule(ruleId, extensionVersion);
        assert.deepEqual(actualRule, expectedRule);
    });

    it('should include the extension version in the header value', () => {
        const version = '2025.8.3';
        const rule = generateExtensionDetectionHeaderRule(ruleId, version);
        assert.equal(rule.action.requestHeaders[0].value, version);
    });

    it('should only target duckduckgo.com domain', () => {
        const rule = generateExtensionDetectionHeaderRule(ruleId, extensionVersion);
        assert.deepEqual(rule.condition.requestDomains, ['duckduckgo.com']);
    });
});
