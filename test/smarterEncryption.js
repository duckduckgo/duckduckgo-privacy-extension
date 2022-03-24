const assert = require('assert')

const {
    SMARTER_ENCRYPTION_PRIORITY,
    generateSmarterEncryptionRuleset
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
})
