const assert = require('assert')

const {
    BASELINE_PRIORITY,
    PRIORITY_INCREMENT,
    MAXIMUM_RULES_PER_TRACKER_ENTRY
} = require('../lib/trackerAllowlist')

const {
    generateExtensionConfigurationRuleset
} = require('../lib/extensionConfiguration')

async function isRegexSupportedTrue ({ regex, isCaseSensitive }) {
    return { isSupported: true }
}

describe('Tracker Allowlist', () => {
    it('should reject extension configuration if there are too many rules ' +
       'for a tracker blocking allowlist entry', async () => {
        const rules = new Array(MAXIMUM_RULES_PER_TRACKER_ENTRY)
        rules.fill({
            rule: 'example\\.com', domains: ['<all>'], reason: ''
        })

        const extensionConfig = {
            features: {
                trackerAllowlist: {
                    state: 'enabled',
                    settings: {
                        allowlistedTrackers: {
                            'example.invalid': {
                                rules
                            }
                        }
                    }
                }
            }
        }

        await assert.doesNotReject(() =>
            generateExtensionConfigurationRuleset(
                extensionConfig, [], isRegexSupportedTrue
            )
        )

        rules.push(rules[0])

        await assert.rejects(() =>
            generateExtensionConfigurationRuleset(
                extensionConfig,
                [],
                isRegexSupportedTrue
            )
        )
    })

    it('should return no rules if trackerAllowlist feature is disabled or ' +
       'configuration is empty', async () => {
        assert.deepEqual(
            await generateExtensionConfigurationRuleset({
                features: {
                    trackerAllowlist: {}
                }
            }, [], isRegexSupportedTrue),
            { ruleset: [], matchDetailsByRuleId: {} }
        )

        assert.deepEqual(
            await generateExtensionConfigurationRuleset({
                features: {
                    trackerAllowlist: {
                        state: 'disabled',
                        settings: {
                            allowlistedTrackers: {
                                'domain.invalid': {
                                    rules: [{
                                        rule: 'example',
                                        domains: ['<all>'],
                                        reason: 'example'
                                    }]
                                }
                            }
                        }
                    }
                }
            }, [], isRegexSupportedTrue),
            { ruleset: [], matchDetailsByRuleId: {} }
        )

        assert.deepEqual(
            await generateExtensionConfigurationRuleset({
                features: {
                    trackerAllowlist: {
                        state: 'enabled',
                        settings: {
                            allowlistedTrackers: { }
                        }
                    }
                }
            }, [], isRegexSupportedTrue),
            { ruleset: [], matchDetailsByRuleId: {} }
        )
    })

    it('should generate allowlists correctly', async () => {
        const extensionConfig = {
            features: {
                trackerAllowlist: {
                    state: 'enabled',
                    settings: {
                        allowlistedTrackers: {
                            'domain.invalid': {
                                rules: [{
                                    rule: 'domain.invalid/path',
                                    domains: ['<all>'],
                                    reason: 'reason 1'
                                }]
                            },
                            'subdomain.domain.invalid': {
                                rules: [{
                                    rule: 'subdomain.domain.invalid',
                                    domains: [],
                                    reason: 'reason 2'
                                }]
                            },
                            'another.subdomain.domain.invalid': {
                                rules: [
                                    {
                                        rule: 'another.subdomain.domain.invalid',
                                        domains: [
                                            'initiator1.invalid',
                                            'initiator2.invalid'
                                        ],
                                        reason: 'reason 3'
                                    },
                                    {
                                        rule: '12345',
                                        domains: [
                                            'different-initiator.invalid'
                                        ],
                                        reason: 'reason 4'
                                    }
                                ]
                            },
                            'different-tracker.invalid': {
                                rules: [{
                                    rule: 'subdomain.different-tracker.invalid/path',
                                    domains: ['<all>'],
                                    reason: 'reason 5'
                                }]
                            }
                        }
                    }
                }
            }
        }

        const extensionConfigCopy = JSON.parse(JSON.stringify(extensionConfig))

        assert.deepEqual(
            await generateExtensionConfigurationRuleset(
                extensionConfig, [], isRegexSupportedTrue, 23
            ),
            {
                ruleset: [
                    {
                        id: 23,
                        priority: BASELINE_PRIORITY,
                        action: {
                            type: 'allow'
                        },
                        condition: {
                            urlFilter: '||domain.invalid/path',
                            isUrlFilterCaseSensitive: false,
                            excludedRequestDomains: [
                                'subdomain.domain.invalid',
                                'another.subdomain.domain.invalid'
                            ]
                        }
                    },
                    {
                        id: 24,
                        priority: BASELINE_PRIORITY,
                        action: {
                            type: 'allow'
                        },
                        condition: {
                            urlFilter: '||subdomain.domain.invalid',
                            // Note: Case-insensitive matching isn't required
                            //       here. It would be nice to improve this case
                            //       in the future.
                            isUrlFilterCaseSensitive: false,
                            excludedRequestDomains: [
                                'another.subdomain.domain.invalid'
                            ]
                        }
                    },
                    {
                        id: 25,
                        priority: BASELINE_PRIORITY,
                        action: {
                            type: 'allow'
                        },
                        condition: {
                            urlFilter: '12345',
                            // Note: Case-insensitive matching isn't required
                            //       here. It would be nice to improve this case
                            //       in the future.
                            isUrlFilterCaseSensitive: false,
                            requestDomains: [
                                'another.subdomain.domain.invalid'
                            ],
                            initiatorDomains: [
                                'different-initiator.invalid'
                            ]
                        }
                    },
                    {
                        id: 26,
                        priority: BASELINE_PRIORITY + PRIORITY_INCREMENT,
                        action: {
                            type: 'allow'
                        },
                        condition: {
                            urlFilter: '||another.subdomain.domain.invalid',
                            isUrlFilterCaseSensitive: false,
                            initiatorDomains: [
                                'initiator1.invalid',
                                'initiator2.invalid'
                            ]
                        }
                    },
                    {
                        id: 27,
                        priority: BASELINE_PRIORITY,
                        action: {
                            type: 'allow'
                        },
                        condition: {
                            urlFilter: 'subdomain.different-tracker.invalid/path',
                            isUrlFilterCaseSensitive: false,
                            requestDomains: [
                                'different-tracker.invalid'
                            ]
                        }
                    }
                ],
                matchDetailsByRuleId: {
                    23: {
                        type: 'trackerAllowlist',
                        domain: 'domain.invalid',
                        reason: 'reason 1'
                    },
                    24: {
                        type: 'trackerAllowlist',
                        domain: 'subdomain.domain.invalid',
                        reason: 'reason 2'
                    },
                    25: {
                        type: 'trackerAllowlist',
                        domain: 'another.subdomain.domain.invalid',
                        reason: 'reason 4'
                    },
                    26: {
                        type: 'trackerAllowlist',
                        domain: 'another.subdomain.domain.invalid',
                        reason: 'reason 3'
                    },
                    27: {
                        type: 'trackerAllowlist',
                        domain: 'different-tracker.invalid',
                        reason: 'reason 5'
                    }
                }
            }
        )

        // Verify that the extension configuration wasn't mutated.
        assert.deepEqual(extensionConfig, extensionConfigCopy)
    })
})
