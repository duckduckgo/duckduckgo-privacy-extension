const assert = require('assert');

const { PRIORITY } = require('../lib/requestBlocklist');

const { generateExtensionConfigurationRuleset } = require('../lib/extensionConfiguration');

async function isRegexSupportedTrue({ regex, isCaseSensitive }) {
    return { isSupported: true };
}

describe('Request Blocklist', () => {
    it('should return no rules if requestBlocklist feature is disabled or ' + 'configuration is empty', async () => {
        assert.deepEqual(
            await generateExtensionConfigurationRuleset(
                {
                    features: {
                        requestBlocklist: {},
                        contentBlocking: { state: 'enabled' },
                    },
                },
                [],
                isRegexSupportedTrue,
            ),
            { ruleset: [], matchDetailsByRuleId: {} },
        );

        assert.deepEqual(
            await generateExtensionConfigurationRuleset(
                {
                    features: {
                        requestBlocklist: {
                            state: 'disabled',
                            settings: {
                                blockedRequests: {
                                    'domain.invalid': {
                                        rules: [
                                            {
                                                rule: 'example',
                                                domains: ['<all>'],
                                                reason: 'example',
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                        contentBlocking: { state: 'enabled' },
                    },
                },
                [],
                isRegexSupportedTrue,
            ),
            { ruleset: [], matchDetailsByRuleId: {} },
        );

        assert.deepEqual(
            await generateExtensionConfigurationRuleset(
                {
                    features: {
                        requestBlocklist: {
                            state: 'enabled',
                            settings: {
                                blockedRequests: {},
                            },
                        },
                        contentBlocking: { state: 'enabled' },
                    },
                },
                [],
                isRegexSupportedTrue,
            ),
            { ruleset: [], matchDetailsByRuleId: {} },
        );
    });

    it('should generate blocklists correctly', async () => {
        const extensionConfig = {
            features: {
                requestBlocklist: {
                    state: 'enabled',
                    settings: {
                        blockedRequests: {
                            'domain.example': {
                                rules: [
                                    {
                                        rule: 'domain.example/path',
                                        domains: ['<all>'],
                                        reason: 'reason 1',
                                    },
                                ],
                            },
                            'subdomain.domain.example': {
                                rules: [
                                    {
                                        rule: 'subdomain.domain.example/path',
                                        domains: ['<all>'],
                                        reason: 'reason 2',
                                    },
                                ],
                            },
                            'second-domain.example': {
                                rules: [
                                    {
                                        rule: 'second-domain.example',
                                        domains: [],
                                        reason: 'reason 3',
                                    },
                                ],
                            },
                            'third-domain.example': {
                                rules: [
                                    {
                                        rule: 'third-domain.example',
                                        domains: ['website1.example', 'website2.example'],
                                        reason: 'reason 4',
                                    },
                                    {
                                        rule: '12345',
                                        domains: ['website3.example'],
                                        reason: 'reason 5',
                                    },
                                ],
                            },
                            'fourth-domain.example': {
                                rules: [
                                    {
                                        rule: 'subdomain.fourth-domain.example/path',
                                        domains: ['<all>'],
                                        reason: 'reason 6',
                                    },
                                ],
                            },
                        },
                    },
                    exceptions: [
                        {
                            domain: 'exception.example',
                            reason: 'Example request-blocking exception',
                        },
                    ],
                },
                contentBlocking: { state: 'enabled' },
            },
        };

        const extensionConfigCopy = JSON.parse(JSON.stringify(extensionConfig));

        assert.deepEqual(await generateExtensionConfigurationRuleset(extensionConfig, [], isRegexSupportedTrue, 23), {
            ruleset: [
                {
                    id: 23,
                    priority: PRIORITY,
                    action: {
                        type: 'block',
                    },
                    condition: {
                        urlFilter: '||domain.example/path',
                        isUrlFilterCaseSensitive: true,
                        excludedInitiatorDomains: ['exception.example'],
                        excludedRequestDomains: ['exception.example'],
                    },
                },
                {
                    id: 24,
                    priority: PRIORITY,
                    action: {
                        type: 'block',
                    },
                    condition: {
                        urlFilter: '||second-domain.example',
                        isUrlFilterCaseSensitive: true,
                        excludedInitiatorDomains: ['exception.example'],
                        excludedRequestDomains: ['exception.example'],
                    },
                },
                {
                    id: 25,
                    priority: PRIORITY,
                    action: {
                        type: 'block',
                    },
                    condition: {
                        urlFilter: '||third-domain.example',
                        isUrlFilterCaseSensitive: true,
                        initiatorDomains: ['website1.example', 'website2.example'],
                        excludedInitiatorDomains: ['exception.example'],
                        excludedRequestDomains: ['exception.example'],
                    },
                },
                {
                    id: 26,
                    priority: PRIORITY,
                    action: {
                        type: 'block',
                    },
                    condition: {
                        urlFilter: '12345',
                        isUrlFilterCaseSensitive: true,
                        requestDomains: ['third-domain.example'],
                        initiatorDomains: ['website3.example'],
                        excludedInitiatorDomains: ['exception.example'],
                        excludedRequestDomains: ['exception.example'],
                    },
                },
                {
                    id: 27,
                    priority: PRIORITY,
                    action: {
                        type: 'block',
                    },
                    condition: {
                        urlFilter: 'subdomain.fourth-domain.example/path',
                        isUrlFilterCaseSensitive: true,
                        requestDomains: ['fourth-domain.example'],
                        excludedInitiatorDomains: ['exception.example'],
                        excludedRequestDomains: ['exception.example'],
                    },
                },
            ],
            matchDetailsByRuleId: {
                23: {
                    type: 'requestBlocklist',
                    domain: 'domain.example',
                    reason: 'reason 1',
                },
                24: {
                    type: 'requestBlocklist',
                    domain: 'second-domain.example',
                    reason: 'reason 3',
                },
                25: {
                    type: 'requestBlocklist',
                    domain: 'third-domain.example',
                    reason: 'reason 4',
                },
                26: {
                    type: 'requestBlocklist',
                    domain: 'third-domain.example',
                    reason: 'reason 5',
                },
                27: {
                    type: 'requestBlocklist',
                    domain: 'fourth-domain.example',
                    reason: 'reason 6',
                },
            },
        });

        // Verify that the extension configuration wasn't mutated.
        assert.deepEqual(extensionConfig, extensionConfigCopy);
    });
});
