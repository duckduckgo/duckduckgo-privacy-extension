const assert = require('assert')

const {
    AMP_PROTECTION_PRIORITY
} = require('../lib/ampProtection')

const {
    generateExtensionConfigurationRuleset
} = require('../lib/extensionConfiguration')

const baseExtensionConfigStringified = JSON.stringify({
    features: {
        ampLinks: {
            state: 'enabled',
            exceptions: [
                {
                    domain: 'exception1.example',
                    reason: 'Reason 1'
                },
                {
                    domain: 'exception2.example',
                    reason: 'Reason 2'
                }
            ],
            settings: {
                linkFormats: [
                    '^https?:\\/\\/(?:w{3}\\.)?google\\.\\S{2,}\\/amp\\/s\\/(\\S+)$',
                    '^https?:\\/\\/\\S+ampproject\\.org\\/\\S\\/s\\/(\\S+)$'
                ],
                // Ignored for now.
                deepExtractionEnabled: true,
                deepExtractionTimeout: 1500,
                keywords: [
                    '=amp',
                    'amp=',
                    '&amp',
                    'amp&',
                    '/amp',
                    'amp/',
                    '.amp',
                    'amp.',
                    '%amp',
                    'amp%',
                    '_amp',
                    'amp_',
                    '?amp'
                ]
            }
        }
    }
})

async function isRegexSupportedTrue ({ regex, isCaseSensitive }) {
    return { isSupported: true }
}

async function isRegexSupportedFalse ({ regex, isCaseSensitive }) {
    return { isSupported: false }
}

async function rulesetEqual (
    extensionConfig, isRegexSupported, expectedRuleset, expectedLookup
) {
    const extensionConfigBefore = JSON.stringify(extensionConfig)

    const {
        ruleset: actualRuleset,
        matchDetailsByRuleId: actualLookup
    } = await generateExtensionConfigurationRuleset(
        extensionConfig, [], isRegexSupported
    )

    assert.deepEqual(actualRuleset, expectedRuleset)
    assert.deepEqual(actualLookup, expectedLookup)

    // Verify the extension config wasn't mutated.
    assert.deepEqual(extensionConfig, JSON.parse(extensionConfigBefore))
}

describe('AMP link protection', () => {
    it('should not generate AMP protection rules if disabled', async () => {
        const extensionConfig = JSON.parse(baseExtensionConfigStringified)
        extensionConfig.features.ampLinks.state = 'disabled'

        await rulesetEqual(extensionConfig, isRegexSupportedTrue, [], {})
    })

    it('should skip unsupported regexFilters', async () => {
        const extensionConfig = JSON.parse(baseExtensionConfigStringified)

        await rulesetEqual(extensionConfig, isRegexSupportedFalse, [], {})
    })

    it('should generate AMP protection rules correctly', async () => {
        const extensionConfig = JSON.parse(baseExtensionConfigStringified)

        await rulesetEqual(extensionConfig, isRegexSupportedTrue,
            [
                {
                    id: 1,
                    priority: AMP_PROTECTION_PRIORITY,
                    action: {
                        type: 'redirect',
                        redirect: { regexSubstitution: 'https://\\1' }
                    },
                    condition: {
                        isUrlFilterCaseSensitive: false,
                        regexFilter: '^https?:\\/\\/(?:w{3}\\.)?google\\..{2,}\\/amp\\/s\\/(.+)$',
                        resourceTypes: ['main_frame'],
                        excludedInitiatorDomains: [
                            'exception1.example',
                            'exception2.example'
                        ],
                        excludedRequestDomains: [
                            'exception1.example',
                            'exception2.example'
                        ]
                    }
                },
                {
                    id: 2,
                    priority: AMP_PROTECTION_PRIORITY,
                    action: {
                        type: 'redirect',
                        redirect: { regexSubstitution: 'https://\\1' }
                    },
                    condition: {
                        isUrlFilterCaseSensitive: false,
                        regexFilter: '^https?:\\/\\/.+ampproject\\.org\\/.\\/s\\/(.+)$',
                        resourceTypes: ['main_frame'],
                        excludedInitiatorDomains: [
                            'exception1.example',
                            'exception2.example'
                        ],
                        excludedRequestDomains: [
                            'exception1.example',
                            'exception2.example'
                        ]
                    }
                }
            ],
            {
                1: { type: 'ampProtection' },
                2: { type: 'ampProtection' }
            }
        )
    })
})
