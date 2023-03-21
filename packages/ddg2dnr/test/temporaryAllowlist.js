const assert = require('assert')

const {
    CONTENT_BLOCKING_ALLOWLIST_PRIORITY,
    UNPROTECTED_TEMPORARY_ALLOWLIST_PRIORITY
} = require('../lib/temporaryAllowlist')

const {
    generateExtensionConfigurationRuleset
} = require('../lib/extensionConfiguration')

async function isRegexSupportedTrue ({ regex, isCaseSensitive }) {
    return { isSupported: true }
}

const baseExtensionConfigStringifed = JSON.stringify({
    features: {
        contentBlocking: {
            state: 'enabled',
            exceptions: [{
                domain: 'content-blocking1.example',
                reason: 'First contentBlocking reason'
            }, {
                domain: 'content-blocking2.example',
                reason: 'Second contentBlocking reason'
            }]
        }
    },
    unprotectedTemporary: [{
        domain: 'unprotected-temporary1.example',
        reason: 'First unprotectedTemporary reason'
    }, {
        domain: 'unprotected-temporary2.example',
        reason: 'Second unprotectedTemporary reason'
    }]
})

async function rulesetEqual (
    extensionConfig, denylistedDomains, expectedRuleset, expectedLookup
) {
    const extensionConfigBefore = JSON.stringify(extensionConfig)

    const {
        ruleset: actualRuleset,
        matchDetailsByRuleId: actualLookup
    } = await generateExtensionConfigurationRuleset(
        extensionConfig, denylistedDomains, isRegexSupportedTrue
    )

    assert.deepEqual(actualRuleset, expectedRuleset)
    assert.deepEqual(actualLookup, expectedLookup)

    // Verify the extension config wasn't mutated.
    assert.deepEqual(extensionConfig, JSON.parse(extensionConfigBefore))
}

describe('Temporary Allowlist', () => {
    it('should generate allowlisting rules correctly', async () => {
        const extensionConfig = JSON.parse(baseExtensionConfigStringifed)

        await rulesetEqual(
            extensionConfig,
            [],
            [
                {
                    id: 1,
                    priority: UNPROTECTED_TEMPORARY_ALLOWLIST_PRIORITY,
                    condition: {
                        requestDomains: [
                            'unprotected-temporary1.example'
                        ],
                        resourceTypes: [
                            'main_frame'
                        ]
                    },
                    action: {
                        type: 'allowAllRequests'
                    }
                },
                {
                    id: 2,
                    priority: UNPROTECTED_TEMPORARY_ALLOWLIST_PRIORITY,
                    condition: {
                        requestDomains: [
                            'unprotected-temporary2.example'
                        ],
                        resourceTypes: [
                            'main_frame'
                        ]
                    },
                    action: {
                        type: 'allowAllRequests'
                    }
                },
                {
                    id: 3,
                    priority: CONTENT_BLOCKING_ALLOWLIST_PRIORITY,
                    condition: {
                        requestDomains: [
                            'content-blocking1.example'
                        ],
                        resourceTypes: [
                            'main_frame'
                        ]
                    },
                    action: {
                        type: 'allowAllRequests'
                    }
                },
                {
                    id: 4,
                    priority: CONTENT_BLOCKING_ALLOWLIST_PRIORITY,
                    condition: {
                        requestDomains: [
                            'content-blocking2.example'
                        ],
                        resourceTypes: [
                            'main_frame'
                        ]
                    },
                    action: {
                        type: 'allowAllRequests'
                    }
                }
            ],
            {
                1: {
                    type: 'unprotectedTemporary',
                    domain: 'unprotected-temporary1.example',
                    reason: 'First unprotectedTemporary reason'
                },
                2: {
                    type: 'unprotectedTemporary',
                    domain: 'unprotected-temporary2.example',
                    reason: 'Second unprotectedTemporary reason'
                },
                3: {
                    type: 'contentBlocking',
                    domain: 'content-blocking1.example',
                    reason: 'First contentBlocking reason'
                },
                4: {
                    type: 'contentBlocking',
                    domain: 'content-blocking2.example',
                    reason: 'Second contentBlocking reason'
                }
            }
        )
    })

    it('shouldn\'t generate contentBlocking rules if disabled', async () => {
        const extensionConfig = JSON.parse(baseExtensionConfigStringifed)
        extensionConfig.features.contentBlocking.state = 'disabled'
        delete extensionConfig.unprotectedTemporary

        await rulesetEqual(extensionConfig, [], [], {})
    })

    it('shouldn\'t generate rules for denylisted domains', async () => {
        const extensionConfig = JSON.parse(baseExtensionConfigStringifed)

        await rulesetEqual(
            extensionConfig,
            [
                'content-blocking2.example',
                'different-domain.example',
                'unprotected-temporary1.example'
            ],
            [
                {
                    id: 1,
                    priority: UNPROTECTED_TEMPORARY_ALLOWLIST_PRIORITY,
                    condition: {
                        requestDomains: [
                            'unprotected-temporary2.example'
                        ],
                        resourceTypes: [
                            'main_frame'
                        ]
                    },
                    action: {
                        type: 'allowAllRequests'
                    }
                },
                {
                    id: 2,
                    priority: CONTENT_BLOCKING_ALLOWLIST_PRIORITY,
                    condition: {
                        requestDomains: [
                            'content-blocking1.example'
                        ],
                        resourceTypes: [
                            'main_frame'
                        ]
                    },
                    action: {
                        type: 'allowAllRequests'
                    }
                }
            ],
            {
                1: {
                    type: 'unprotectedTemporary',
                    domain: 'unprotected-temporary2.example',
                    reason: 'Second unprotectedTemporary reason'
                },
                2: {
                    type: 'contentBlocking',
                    domain: 'content-blocking1.example',
                    reason: 'First contentBlocking reason'
                }
            }
        )
    })
})
