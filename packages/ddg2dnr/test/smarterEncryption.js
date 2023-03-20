const assert = require('assert')

const {
    SMARTER_ENCRYPTION_PRIORITY,
    generateSmarterEncryptionRuleset,
    createSmarterEncryptionTemporaryRule
} = require('../lib/smarterEncryption')

describe('generateSmarterEncryptionRuleset', () => {
    it('should return an empty list of rules if there are no domains', () => {
        assert.equal(generateSmarterEncryptionRuleset([]).length, 0)
    })

    it('should generate a basic rule', () => {
        assert.deepEqual(generateSmarterEncryptionRuleset([
            'domain.invalid'
        ]), [
            {
                id: 1,
                priority: SMARTER_ENCRYPTION_PRIORITY,
                action: {
                    type: 'upgradeScheme'
                },
                condition: {
                    resourceTypes: [
                        'main_frame',
                        'sub_frame',
                        'stylesheet',
                        'script',
                        'image',
                        'font',
                        'object',
                        'xmlhttprequest',
                        'ping',
                        'csp_report',
                        'media',
                        'websocket',
                        'webtransport',
                        'webbundle',
                        'other'
                    ],
                    requestDomains: [
                        'domain.invalid'
                    ],
                    regexFilter: '^http://[^.]+\\.[^.]+(:|/|$)'
                }
            }
        ])
    })

    it('should group domains by subdomain count', () => {
        assert.deepEqual(generateSmarterEncryptionRuleset([
            'domain.invalid',
            'subdomain.domain.invalid',
            'anotherdomain.invalid',
            'subdomain.anotherdomain.invalid',
            'a.b.c.d.e.invalid'
        ]), [
            {
                id: 1,
                priority: SMARTER_ENCRYPTION_PRIORITY,
                action: {
                    type: 'upgradeScheme'
                },
                condition: {
                    resourceTypes: [
                        'main_frame',
                        'sub_frame',
                        'stylesheet',
                        'script',
                        'image',
                        'font',
                        'object',
                        'xmlhttprequest',
                        'ping',
                        'csp_report',
                        'media',
                        'websocket',
                        'webtransport',
                        'webbundle',
                        'other'
                    ],
                    requestDomains: [
                        'domain.invalid',
                        'anotherdomain.invalid'
                    ],
                    regexFilter: '^http://[^.]+\\.[^.]+(:|/|$)'
                }
            },
            {
                id: 2,
                priority: SMARTER_ENCRYPTION_PRIORITY,
                action: {
                    type: 'upgradeScheme'
                },
                condition: {
                    resourceTypes: [
                        'main_frame',
                        'sub_frame',
                        'stylesheet',
                        'script',
                        'image',
                        'font',
                        'object',
                        'xmlhttprequest',
                        'ping',
                        'csp_report',
                        'media',
                        'websocket',
                        'webtransport',
                        'webbundle',
                        'other'
                    ],
                    requestDomains: [
                        'subdomain.domain.invalid',
                        'subdomain.anotherdomain.invalid'
                    ],
                    regexFilter: '^http://[^.]+\\.[^.]+\\.[^.]+(:|/|$)'
                }
            },
            {
                id: 3,
                priority: SMARTER_ENCRYPTION_PRIORITY,
                action: {
                    type: 'upgradeScheme'
                },
                condition: {
                    resourceTypes: [
                        'main_frame',
                        'sub_frame',
                        'stylesheet',
                        'script',
                        'image',
                        'font',
                        'object',
                        'xmlhttprequest',
                        'ping',
                        'csp_report',
                        'media',
                        'websocket',
                        'webtransport',
                        'webbundle',
                        'other'
                    ],
                    requestDomains: [
                        'a.b.c.d.e.invalid'
                    ],
                    regexFilter: '^http://[^.]+\\.[^.]+\\.[^.]+\\.[^.]+\\.[^.]+\\.[^.]+(:|/|$)'
                }
            }
        ])
    })

    it('should handle the www. subdomain correctly', () => {
        assert.deepEqual(generateSmarterEncryptionRuleset([
            'domain.invalid',
            'www.domain.invalid',
            'anotherdomain.invalid',
            'www.anotherdomain.invalid',
            'third-domain.invalid',
            'www.fourth-domain.invalid'
        ]), [
            {
                id: 1,
                priority: SMARTER_ENCRYPTION_PRIORITY,
                action: {
                    type: 'upgradeScheme'
                },
                condition: {
                    resourceTypes: [
                        'main_frame',
                        'sub_frame',
                        'stylesheet',
                        'script',
                        'image',
                        'font',
                        'object',
                        'xmlhttprequest',
                        'ping',
                        'csp_report',
                        'media',
                        'websocket',
                        'webtransport',
                        'webbundle',
                        'other'
                    ],
                    requestDomains: [
                        'third-domain.invalid'
                    ],
                    regexFilter: '^http://[^.]+\\.[^.]+(:|/|$)'
                }
            },
            {
                id: 2,
                priority: SMARTER_ENCRYPTION_PRIORITY,
                action: {
                    type: 'upgradeScheme'
                },
                condition: {
                    resourceTypes: [
                        'main_frame',
                        'sub_frame',
                        'stylesheet',
                        'script',
                        'image',
                        'font',
                        'object',
                        'xmlhttprequest',
                        'ping',
                        'csp_report',
                        'media',
                        'websocket',
                        'webtransport',
                        'webbundle',
                        'other'
                    ],
                    requestDomains: [
                        'www.fourth-domain.invalid'
                    ],
                    regexFilter: '^http://[^.]+\\.[^.]+\\.[^.]+(:|/|$)'
                }
            },
            {
                id: 3,
                priority: SMARTER_ENCRYPTION_PRIORITY,
                action: {
                    type: 'upgradeScheme'
                },
                condition: {
                    resourceTypes: [
                        'main_frame',
                        'sub_frame',
                        'stylesheet',
                        'script',
                        'image',
                        'font',
                        'object',
                        'xmlhttprequest',
                        'ping',
                        'csp_report',
                        'media',
                        'websocket',
                        'webtransport',
                        'webbundle',
                        'other'
                    ],
                    requestDomains: [
                        'domain.invalid',
                        'anotherdomain.invalid'
                    ],
                    regexFilter: '^http://(www\\.)?[^.]+\\.[^.]+(:|/|$)'
                }
            }
        ])
    })

    it('should honour starting rule ID parameter', () => {
        assert.deepEqual(generateSmarterEncryptionRuleset([
            'domain.invalid',
            'www.domain.invalid',
            'anotherdomain.invalid',
            'www.anotherdomain.invalid',
            'third-domain.invalid',
            'www.fourth-domain.invalid'
        ], 4321).map(rule => rule.id), [4321, 4322, 4323])
    })

    it('should upgrade insecure requests from provided domains', async function () {
        const ruleset = generateSmarterEncryptionRuleset(['privacy-test-pages.glitch.me'])
        await this.browser.addRules(ruleset)
        const matchedRules = await this.browser.testMatchOutcome({
            url: 'http://privacy-test-pages.glitch.me/insecure',
            type: 'main_frame',
            tabId: 1
        })
        assert.equal(matchedRules.length, 1)
        assert.equal(matchedRules[0].action.type, 'upgradeScheme')
    })

    it('createSmarterEncryptionExceptionRule should prevent https upgrade for domain', async function () {
        const testDomains = ['privacy-test-pages.glitch.me', 'glitch.me']
        await this.browser.addRules(generateSmarterEncryptionRuleset(testDomains, 2))
        await this.browser.addRules([createSmarterEncryptionTemporaryRule([testDomains[0]], 'allow', 1).rule])
        const expectNotUpgraded = await this.browser.testMatchOutcome({
            url: 'http://privacy-test-pages.glitch.me/insecure',
            type: 'main_frame',
            tabId: 1
        })
        assert.equal(expectNotUpgraded.length, 1)
        assert.equal(expectNotUpgraded[0].action.type, 'allow')
        const expectUpgraded = await this.browser.testMatchOutcome({
            url: 'http://glitch.me/insecure',
            type: 'main_frame',
            tabId: 1
        })
        assert.equal(expectUpgraded.length, 1)
        assert.equal(expectUpgraded[0].action.type, 'upgradeScheme')
    })

    it('createSmarterEncryptionExceptionRule should create correct allow rule', function () {
        const testDomains = ['example.com', 'sub.test.com']
        assert.deepEqual(createSmarterEncryptionTemporaryRule(testDomains, 'allow', 4).rule, {
            id: 4,
            priority: SMARTER_ENCRYPTION_PRIORITY,
            action: {
                type: 'allow'
            },
            condition: {
                requestDomains: testDomains,
                resourceTypes: [
                    'main_frame',
                    'sub_frame',
                    'stylesheet',
                    'script',
                    'image',
                    'font',
                    'object',
                    'xmlhttprequest',
                    'ping',
                    'csp_report',
                    'media',
                    'websocket',
                    'webtransport',
                    'webbundle',
                    'other'
                ]
            }
        })
    })

    it('createSmarterEncryptionExceptionRule should create correct upgrade rule', function () {
        const testDomains = ['example.com', 'sub.test.com']
        assert.deepEqual(createSmarterEncryptionTemporaryRule(testDomains, 'upgrade', 4).rule, {
            id: 4,
            priority: SMARTER_ENCRYPTION_PRIORITY,
            action: {
                type: 'upgradeScheme'
            },
            condition: {
                requestDomains: testDomains,
                resourceTypes: [
                    'main_frame',
                    'sub_frame',
                    'stylesheet',
                    'script',
                    'image',
                    'font',
                    'object',
                    'xmlhttprequest',
                    'ping',
                    'csp_report',
                    'media',
                    'websocket',
                    'webtransport',
                    'webbundle',
                    'other'
                ]
            }
        })
    })

    it('createSmarterEncryptionExceptionRule throws for invalid type', function () {
        // @ts-ignore
        assert.throws(() => createSmarterEncryptionTemporaryRule([], 'block'))
    })
})
