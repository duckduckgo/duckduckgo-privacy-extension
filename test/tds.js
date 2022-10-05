const assert = require('assert')

const {
    BASELINE_PRIORITY,
    SUBDOMAIN_PRIORITY_INCREMENT,
    TRACKER_RULE_PRIORITY_INCREMENT,
    MAXIMUM_SUBDOMAIN_PRIORITY,
    MAXIMUM_TRACKER_RULE_PRIORITY_INCREMENT,
    MAXIMUM_REGEX_RULES,
    generateTdsRuleset
} = require('../lib/tds')

const MAXIMUM_RULES_PER_DOMAIN = Math.floor(
    MAXIMUM_TRACKER_RULE_PRIORITY_INCREMENT /
        TRACKER_RULE_PRIORITY_INCREMENT
)

const supportedSurrogateScripts = new Set(['supported.js', 'supported2.js'])

function emptyBlockList () {
    return {
        cnames: {},
        domains: {},
        entities: {},
        trackers: {}
    }
}

async function isRegexSupportedTrue ({ regex, isCaseSensitive }) {
    return { isSupported: true }
}

async function isRegexSupportedFalse ({ regex, isCaseSensitive }) {
    return { isSupported: false }
}

function addDomain (blockList, domain, entity, defaultAction, rules) {
    blockList.domains[domain] = entity

    if (!blockList.entities[entity]) {
        blockList.entities[entity] = {
            domains: []
        }
    }
    blockList.entities[entity].domains.push(domain)

    if (!defaultAction) {
        return
    }

    blockList.trackers[domain] = {
        domain,
        owner: {
            name: entity
        },
        default: defaultAction
    }

    if (rules) {
        // Rules can either be a string, or a RegExp Object. To ensure both are
        // handled, convert every other rule to a RegExp Object.
        for (let i = 0; i < rules.length; i++) {
            if (i % 2) {
                rules[i].rule = new RegExp(rules[i].rule)
            }
        }

        blockList.trackers[domain].rules = rules
    }
}

function stringifyBlocklist (tds) {
    return JSON.stringify(
        tds,
        (key, value) => value instanceof RegExp ? value.source : value,
        2
    )
}

/**
 * @typedef {object} rulesetEqualOptions
 * @property {object[]} [expectedRuleset]
 *   The expected declarativeNetRequest ruleset.
 * @property {object} [expectedLookup]
 *   The expected ruleId -> matchDetails lookup.
 * @property {function} [rulesetTransform]
 *   Function to apply to the generated ruleset before comparing it to the
 *   expected ruleset.
 * @property {function} [ruleTransform]
 *   Function to apply to each of the generated rules, before the ruleset is
 *   compared to the expected ruleset.
 * @property {function} [lookupTransform]
 *   Function to apply to the generated lookup before comparing it to the
 *   expected lookup.
 */

/**
 * Generates a declarativeNetRequest ruleset for the given block list and
 * compares that to an expected ruleset. Optionally also compares the generated
 * ruleId -> matchDetails lookup to an expected lookup.
 * @param {object} tds
 *   The Tracker Blocking configuration.
 * @param {function} isRegexSupported
 *   A function compatible with chrome.declarativeNetRequest.isRegexSupported.
 *   See https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#method-isRegexSupported
 * @param {number|null} startingRuleId
 *   Rule ID for the generated declarativeNetRequest rules to start from. Rule
 *   IDs are incremented sequentially from the starting point. If null is
 *   provided, the startingRuleId argument is not passed through.
 * @param {rulesetEqualOptions} options
 * @return {Promise<>}
 */
async function rulesetEqual (tds, isRegexSupported, startingRuleId, {
    expectedRuleset, expectedLookup, rulesetTransform, ruleTransform,
    lookupTransform
}) {
    const tdsBefore = stringifyBlocklist(tds)

    let result
    if (typeof startingRuleId === 'number') {
        result = await generateTdsRuleset(
            tds, supportedSurrogateScripts, '/', isRegexSupported,
            startingRuleId
        )
    } else {
        result = await generateTdsRuleset(
            tds, supportedSurrogateScripts, '/', isRegexSupported
        )
    }

    assert.deepEqual(stringifyBlocklist(tds), tdsBefore, 'TDS mutated!')
    if (expectedRuleset) {
        /** @type {any} */
        let actualRuleset = result.ruleset
        if (rulesetTransform) {
            actualRuleset = rulesetTransform(actualRuleset)
        }

        if (ruleTransform) {
            actualRuleset = actualRuleset.map(ruleTransform)
        }
        assert.deepEqual(actualRuleset, expectedRuleset)
    }
    if (expectedLookup) {
        let actualLookup = result.matchDetailsByRuleId

        if (lookupTransform) {
            actualLookup = lookupTransform(actualLookup, result.ruleset)
        }
        assert.deepEqual(actualLookup, expectedLookup)
    }
}

describe('generateTdsRuleset', () => {
    it('should reject invalid tds.json file', async () => {
        const invalidBlockLists = [
            undefined,
            1,
            {},
            { domains: {}, entities: {}, trackers: {} },
            { cnames: {}, entities: {}, trackers: {} },
            { cnames: {}, domains: {}, trackers: {} },
            { cnames: {}, domains: {}, entities: {} },
            { cnames: 1, domains: 2, entities: 3, trackers: 4 }
        ]

        for (const blockList of invalidBlockLists) {
            await assert.rejects(() =>
                generateTdsRuleset(
                    blockList, supportedSurrogateScripts, '', () => { }
                )
            )
        }
    })

    it('should notice missing isRegexSupported argument', async () => {
        await assert.rejects(() =>
            // @ts-expect-error - Missing isRegexSupported argument.
            generateTdsRuleset(
                { cnames: {}, domains: {}, entities: {}, trackers: {} }
            )
        )
        await assert.rejects(() =>
            generateTdsRuleset(
                { cnames: {}, domains: {}, entities: {}, trackers: {} },
                // @ts-expect-error - Invalid isRegexSupported argument.
                supportedSurrogateScripts, '', 3
            )
        )
    })

    it('should reject an invalid list of surrogate scripts', async () => {
        await assert.rejects(() =>
            generateTdsRuleset(
                { cnames: {}, domains: {}, entities: {}, trackers: {} },
                // @ts-expect-error - Invalid surrogateScripts argument.
                null, '', 3
            )
        )
    })

    it('should reject a tds.json file that contains too many tracker entries ' +
       'for subdomains of the same domain', async () => {
        const blockList = emptyBlockList()
        const entity = 'Example entity'

        let domain = 'example.invalid'
        for (let priority = BASELINE_PRIORITY;
            priority <= MAXIMUM_SUBDOMAIN_PRIORITY;
            priority += SUBDOMAIN_PRIORITY_INCREMENT,
            domain = 'a.' + domain) {
            addDomain(blockList, domain, entity, 'block')
        }

        const { ruleset } = await generateTdsRuleset(
            blockList, supportedSurrogateScripts, '', isRegexSupportedTrue
        )
        for (const rule of ruleset) {
            assert.ok(typeof rule.priority === 'number' &&
                      rule.priority <= MAXIMUM_SUBDOMAIN_PRIORITY)
        }

        addDomain(blockList, 'a.' + domain, entity, 'block')

        await assert.rejects(() =>
            generateTdsRuleset(
                blockList, supportedSurrogateScripts, '', isRegexSupportedTrue
            )
        )
    })

    it('should reject a tds.json file if a tracker entry contains too many ' +
       'rules', async () => {
        const blockList = emptyBlockList()

        const rules = new Array(MAXIMUM_RULES_PER_DOMAIN)
        rules.fill({ rule: 'example\\.com' })

        const entity = 'Example entity'
        const domain = 'example.invalid'
        addDomain(blockList, domain, entity, 'allow', rules)

        await assert.doesNotReject(() =>
            generateTdsRuleset(
                blockList, supportedSurrogateScripts, '', isRegexSupportedTrue
            )
        )

        blockList.trackers[domain].rules.push({ rule: 'example\\.com/extra' })

        await assert.rejects(() =>
            generateTdsRuleset(
                blockList, supportedSurrogateScripts, '', isRegexSupportedTrue
            )
        )
    })

    it('should reject a tds.json file if it requires too many regular ' +
       'expression rule filters', async () => {
        const blockList = emptyBlockList()

        const maxRegexDomains =
              Math.floor(MAXIMUM_REGEX_RULES / MAXIMUM_RULES_PER_DOMAIN)

        const rules = new Array(MAXIMUM_RULES_PER_DOMAIN)
        rules.fill({ rule: '[0-9]+' })

        const entity = 'Example entity'

        for (let i = 0; i < maxRegexDomains; i++) {
            const domain = 'example' + i + '.invalid'
            addDomain(blockList, domain, entity, 'allow', rules)
        }

        await assert.doesNotReject(() =>
            generateTdsRuleset(
                blockList, supportedSurrogateScripts, '', isRegexSupportedTrue
            )
        )

        addDomain(blockList, 'example-extra.invalid', entity, 'allow', rules)

        await assert.rejects(() =>
            generateTdsRuleset(
                blockList, supportedSurrogateScripts, '', isRegexSupportedTrue
            )
        )
    })

    it('should strip rules with unsupported regexFilters', async () => {
        const blockList = emptyBlockList()
        addDomain(blockList, 'example.invalid', 'Example entity', 'ignore', [
            { rule: '[0-9]+' },
            { rule: 'plaintext' }
        ])

        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            expectedRuleset: [
                {
                    id: 1,
                    priority: BASELINE_PRIORITY +
                        TRACKER_RULE_PRIORITY_INCREMENT,
                    action: {
                        type: 'block'
                    },
                    condition: {
                        requestDomains: [
                            'example.invalid'
                        ],
                        urlFilter: 'plaintext',
                        isUrlFilterCaseSensitive: false,
                        domainType: 'thirdParty'
                    }
                },
                {
                    id: 2,
                    priority: BASELINE_PRIORITY +
                        TRACKER_RULE_PRIORITY_INCREMENT * 2,
                    action: {
                        type: 'block'
                    },
                    condition: {
                        requestDomains: [
                            'example.invalid'
                        ],
                        regexFilter: '[0-9]+',
                        domainType: 'thirdParty'
                    }
                }
            ]
        })

        await rulesetEqual(blockList, isRegexSupportedFalse, null, {
            expectedRuleset: [
                {
                    id: 1,
                    priority: BASELINE_PRIORITY +
                        TRACKER_RULE_PRIORITY_INCREMENT,
                    action: {
                        type: 'block'
                    },
                    condition: {
                        requestDomains: [
                            'example.invalid'
                        ],
                        urlFilter: 'plaintext',
                        isUrlFilterCaseSensitive: false,
                        domainType: 'thirdParty'
                    }
                }
            ]
        })
    })

    it('should return an empty ruleset for an empty tds.json ' +
       'file', async () => {
        await rulesetEqual(
            emptyBlockList(), isRegexSupportedTrue, null,
            { expectedRuleset: [] })
    })

    it('should handle basic tracking entries', async () => {
        const blockList = emptyBlockList()
        addDomain(blockList, 'block.invalid', 'Example entity', 'block')
        // No declarativeNetRequest rule necessary, since default is to allow
        // anyway.
        addDomain(blockList, 'ignore.invalid', 'Example entity', 'ignore')
        // Rule required since tracker domain is more-specific domain of another
        // tracker entry.
        addDomain(blockList, 'allow.block.invalid', 'Example entity', 'ignore')

        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            expectedRuleset: [
                {
                    id: 1,
                    priority: BASELINE_PRIORITY,
                    action: {
                        type: 'block'
                    },
                    condition: {
                        requestDomains: [
                            'block.invalid'
                        ],
                        excludedInitiatorDomains: [
                            'block.invalid',
                            'ignore.invalid',
                            // Note: Excluding this subdomain serves no purpose.
                            //       such subdomain initiator exclusions could
                            //       be stripped as a future improvement.
                            'allow.block.invalid'
                        ]
                    }
                },
                {
                    id: 2,
                    priority: BASELINE_PRIORITY + SUBDOMAIN_PRIORITY_INCREMENT,
                    action: {
                        type: 'allow'
                    },
                    condition: {
                        requestDomains: [
                            'allow.block.invalid'
                        ]
                        // Note: excludedInitiatorDomains are stripped for
                        //       allowing rules. First-party requests won't be
                        //       blocked anyway.
                    }
                }
            ],
            expectedLookup: {
                1: {
                    type: 'trackerBlocking',
                    possibleTrackerDomains: ['block.invalid']
                },
                2: {
                    type: 'trackerBlocking',
                    possibleTrackerDomains: ['allow.block.invalid']
                }
            }
        })
    })

    it('should exclude initiator domains correctly', async () => {
        const blockList = emptyBlockList()
        // Entity has one domain, so 'thirdParty' domainType can be used.
        addDomain(blockList, 'a.invalid', 'Entity A', 'block')
        // Entity has two domains, so excludedInitiatorDomains must be used.
        addDomain(blockList, 'b.invalid', 'Entity B', 'block')
        // No need to exclude initiator domains for default allow actions.
        addDomain(blockList, 'allowed.b.invalid', 'Entity B', 'ignore')
        // Entity has multiple domains, so excludedInitiatorDomains must be
        // used.
        addDomain(blockList, 'c.invalid', 'Entity C', 'block')
        addDomain(blockList, 'foo-c.invalid', 'Entity C')
        addDomain(blockList, 'bar-c.invalid', 'Entity C')

        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            ruleTransform (rule) {
                return [
                    rule.condition.requestDomains.join(','),
                    rule.condition.domainType ||
                        rule.condition.excludedInitiatorDomains?.join(',') || ''
                ]
            },
            expectedRuleset: [
                ['a.invalid', 'thirdParty'],
                ['b.invalid', 'b.invalid,allowed.b.invalid'],
                ['allowed.b.invalid', ''],
                ['c.invalid', 'c.invalid,foo-c.invalid,bar-c.invalid']
            ]
        })
    })

    it('should increase priority for longer domain matches', async () => {
        const blockList = emptyBlockList()
        addDomain(blockList, 'domain.invalid', 'Example entity', 'block')
        addDomain(
            blockList, 'subdomain.domain.invalid', 'Example entity', 'block'
        )
        addDomain(
            blockList, 'another.subdomain.domain.invalid',
            'Example entity', 'block'
        )
        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            ruleTransform (rule) {
                return [rule.condition.requestDomains.join(','), rule.priority]
            },
            expectedRuleset: [
                ['domain.invalid', BASELINE_PRIORITY],
                ['subdomain.domain.invalid',
                    BASELINE_PRIORITY + SUBDOMAIN_PRIORITY_INCREMENT],
                ['another.subdomain.domain.invalid',
                    BASELINE_PRIORITY + (SUBDOMAIN_PRIORITY_INCREMENT * 2)]
            ]
        })
    })

    it('should increase priority for tracker rules, in descending ' +
       'order', async () => {
        const blockList = emptyBlockList()
        addDomain(blockList, 'domain.invalid', 'Example entity', 'ignore', [
            { rule: '1', exceptions: { domains: ['a.invalid'] } },
            { rule: '2' },
            { rule: '3', exceptions: { domains: ['a.invalid'] } },
            { rule: '4', action: 'ignore' },
            { rule: '5' }
        ])

        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            ruleTransform (rule) {
                return [rule.condition.urlFilter, rule.priority]
            },
            expectedRuleset: [
                // Priorities are in descending order, to ensure that the first
                // rule for a tracker entry matches first. That is why the
                // generated declarativeNetRequest rules are in reverse order.
                ['5', BASELINE_PRIORITY + TRACKER_RULE_PRIORITY_INCREMENT],
                ['4', BASELINE_PRIORITY +
                    (TRACKER_RULE_PRIORITY_INCREMENT * 2)],
                ['3', BASELINE_PRIORITY +
                    (TRACKER_RULE_PRIORITY_INCREMENT * 3)],
                // Allowing exception for the rule has the same priority, since
                // declarativeNetRequest rules with 'allow' actions take
                // priority over rules with 'block' action of same priority.
                ['3', BASELINE_PRIORITY +
                    (TRACKER_RULE_PRIORITY_INCREMENT * 3)],
                ['2', BASELINE_PRIORITY +
                    (TRACKER_RULE_PRIORITY_INCREMENT * 4)],
                ['1', BASELINE_PRIORITY +
                    (TRACKER_RULE_PRIORITY_INCREMENT * 5)],
                ['1', BASELINE_PRIORITY +
                    (TRACKER_RULE_PRIORITY_INCREMENT * 5)]
            ]
        })
    })

    it('should handle cname matching', async () => {
        const blockList = emptyBlockList()
        addDomain(blockList, 'block.invalid', 'Example entity', 'block')
        addDomain(blockList, 'allow.block.invalid', 'Example entity', 'ignore')
        addDomain(blockList, 'block.block.invalid', 'Example entity', 'block')
        addDomain(blockList, 'second.invalid', 'second entity')
        addDomain(blockList, 'third.invalid', 'third entity')
        addDomain(blockList, 'fourth.invalid', 'fourth entity')

        // With '.' prefix.
        blockList.cnames['cname.second.invalid'] = '.subdomain.block.invalid'
        // Without '.' prefix.
        blockList.cnames['cname.a.b.c.d.third.invalid'] =
            'subdomain.a.b.c.d.block.invalid'
        blockList.cnames['root-cname.third.invalid'] = '.block.invalid'
        // Ignored since it maps to a domain that does not have a tracker entry.
        blockList.cnames['ignored-cname.third.invalid'] =
            '.subdomain.fourth.invalid'

        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            expectedRuleset: [
                {
                    id: 1,
                    priority: BASELINE_PRIORITY,
                    action: {
                        type: 'block'
                    },
                    condition: {
                        excludedInitiatorDomains: [
                            'block.invalid',
                            'allow.block.invalid',
                            'block.block.invalid'
                            // Skipped, since doesn't help + adds to ruleset
                            // size.
                            // 'cname.second.invalid',
                            // 'cname.a.b.c.d.third.invalid',
                            // 'root-cname.third.invalid'
                        ],
                        requestDomains: [
                            'block.invalid',
                            'cname.second.invalid',
                            'cname.a.b.c.d.third.invalid',
                            'root-cname.third.invalid'
                        ]
                    }
                },
                {
                    id: 2,
                    priority: BASELINE_PRIORITY + SUBDOMAIN_PRIORITY_INCREMENT,
                    action: {
                        type: 'allow'
                    },
                    condition: {
                        requestDomains: [
                            'allow.block.invalid'
                        ]
                    }
                },
                {
                    id: 3,
                    priority: BASELINE_PRIORITY + SUBDOMAIN_PRIORITY_INCREMENT,
                    action: {
                        type: 'block'
                    },
                    condition: {
                        excludedInitiatorDomains: [
                            'block.invalid',
                            'allow.block.invalid',
                            'block.block.invalid'
                            // Skipped, since doesn't help + adds to ruleset
                            // size.
                            // 'cname.second.invalid',
                            // 'cname.a.b.c.d.third.invalid',
                            // 'root-cname.third.invalid'
                        ],
                        requestDomains: [
                            'block.block.invalid'
                        ]
                    }
                }
            ]
        })
    })

    it('should ignore cname entries for subdomains of tracking ' +
       'domains', async () => {
        const blockList = emptyBlockList()
        // Do not require declarativeNetRequest rules since they are default
        // action ignore.
        addDomain(blockList, 'first.invalid', 'First entity', 'ignore')
        addDomain(blockList, 'second.invalid', 'Second entity', 'ignore')

        // Ignored since first.invalid is a tracking domain.
        blockList.cnames['cname.first.invalid'] = '.second.invalid'
        // Ignored since unknown.invalid does not map to a tracker entry.
        blockList.cnames['ignored-cname.first.invalid'] = '.unknown.invalid'

        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            expectedRuleset: []
        })
    })

    it('should handle ignore rules', async () => {
        const blockList = emptyBlockList()
        addDomain(blockList, 'block.invalid', 'Example entity', 'block', [{
            rule: 'block\\.invalid\\/path',
            action: 'ignore'
        }])

        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            expectedRuleset: [
                {
                    id: 1,
                    priority: BASELINE_PRIORITY,
                    action: {
                        type: 'block'
                    },
                    condition: {
                        requestDomains: [
                            'block.invalid'
                        ],
                        domainType: 'thirdParty'
                    }
                },
                {
                    id: 2,
                    priority: BASELINE_PRIORITY +
                              TRACKER_RULE_PRIORITY_INCREMENT,
                    action: {
                        type: 'allow'
                    },
                    condition: {
                        urlFilter: '||block.invalid/path',
                        isUrlFilterCaseSensitive: false
                    }
                }
            ]
        })
    })

    it('should handle block rules', async () => {
        const blockList = emptyBlockList()
        addDomain(blockList, 'allow.invalid', 'Example entity', 'ignore', [
            { rule: 'allow\\.invalid\\/path' },
            { rule: 'example.*urlfilter', action: 'block' },
            { rule: 'example[0-9]+regexp' }
        ])

        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            expectedRuleset: [
                {
                    id: 1,
                    priority: BASELINE_PRIORITY +
                              TRACKER_RULE_PRIORITY_INCREMENT,
                    action: {
                        type: 'block'
                    },
                    condition: {
                        regexFilter: 'example[0-9]+regexp',
                        isUrlFilterCaseSensitive: false,
                        requestDomains: [
                            'allow.invalid'
                        ],
                        domainType: 'thirdParty'
                    }
                },
                {
                    id: 2,
                    priority: BASELINE_PRIORITY +
                              (TRACKER_RULE_PRIORITY_INCREMENT * 2),
                    action: {
                        type: 'block'
                    },
                    condition: {
                        urlFilter: 'example*urlfilter',
                        isUrlFilterCaseSensitive: false,
                        requestDomains: [
                            'allow.invalid'
                        ],
                        domainType: 'thirdParty'
                    }
                },
                {
                    id: 3,
                    priority: BASELINE_PRIORITY +
                              (TRACKER_RULE_PRIORITY_INCREMENT * 3),
                    action: {
                        type: 'block'
                    },
                    condition: {
                        urlFilter: '||allow.invalid/path',
                        isUrlFilterCaseSensitive: false,
                        domainType: 'thirdParty'
                    }
                }
            ]
        })
    })

    it('should handle urlFilters/regexFilters correctly', async () => {
        const blockList = emptyBlockList()
        addDomain(blockList, 'domain.invalid', 'Example entity', 'ignore', [
            // urlFilter
            {
                // Empty.
                rule: ''
            },
            {
                // Only contains domain part.
                rule: 'domain\\.invalid'
            },
            {
                // Contains wildcard directly after domain part.
                rule: 'domain\\.invalid.*\\/path'
            },
            {
                // Starts with domain, alpha chars after domain.
                rule: 'domain\\.invalid\\/domain'
            },
            {
                // Starts with domain, no-alpha chars after domain.
                rule: 'domain\\.invalid\\/12345'
            },
            {
                // Doesn't start with domain, alpha chars.
                rule: 'path'
            },
            {
                // Doesn't start with domain, no-alpha chars.
                rule: '12345'
            },
            {
                // Contains domain, but does not start with it.
                // Note: Perhaps this case could be handled better.
                rule: 'subdomain\\.domain\\.invalid'
            },
            // regexFilter
            {
                // Unescaped '.', so does not start with domain + needs regex.
                rule: 'domain.invalid\\/domainregexp'
            },
            {
                // Requires regex.
                rule: 'domain\\.invalid\\/domainregexp[0-9]+'
            },
            {
                // .* wildcard can be handled by urlFilter.
                rule: 'domain\\.invalid\\/wild.*card'
            },
            {
                // * wildcard required regex.
                rule: 'domain\\.invalid\\/regexp*wildcard'
            },
            {
                // . wildcard requires regex.
                rule: 'domain\\.invalid\\/regexp.wildcard'
            },
            {
                // '*' literals don't translate to urlFilter unfortunately.
                rule: 'domain\\.invalid\\/escaped\\*wildcard'
            },
            {
                // Requires regexp, but domain part can be stripped.
                rule: 'domain\\.invalid.*\\/path[0-9]+'
            },
            {
                // Requires regexp, but not case insensitive matching.
                rule: 'domain\\.invalid\\/[0-9]+'
            },
            {
                // Requires regexp, but not case insensitive matching.
                rule: '[0-9]+'
            }
        ])

        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            ruleTransform (rule) {
                return [
                    rule.condition.urlFilter || '',
                    rule.condition.regexFilter || '',
                    rule.condition.isUrlFilterCaseSensitive === false
                ]
            },
            rulesetTransform (ruleset) {
                return ruleset.reverse()
            },
            expectedRuleset: [
                // urlFilter
                ['', '', false],
                ['', '', false],
                ['/path', '', true],
                ['||domain.invalid/domain', '', true],
                ['||domain.invalid/12345', '', false],
                ['path', '', true],
                ['12345', '', false],
                ['subdomain.domain.invalid', '', true],
                // regexFilter
                ['', 'domain.invalid\\/domainregexp', true],
                ['', 'domain\\.invalid\\/domainregexp[0-9]+', true],
                ['||domain.invalid/wild*card', '', true],
                ['', 'domain\\.invalid\\/regexp*wildcard', true],
                ['', 'domain\\.invalid\\/regexp.wildcard', true],
                ['', 'domain\\.invalid\\/escaped\\*wildcard', true],
                ['', '\\/path[0-9]+', true],
                ['', 'domain\\.invalid\\/[0-9]+', false],
                ['', '[0-9]+', false]
            ]
        })
    })

    it('should handle block rules with exceptions', async () => {
        const blockList = emptyBlockList()
        addDomain(blockList, 'block.invalid', 'Example entity', 'block', [
            {
                rule: 'block\\.invalid\\/domain',
                exceptions: { domains: ['allowed.invalid'] }
            },
            {
                rule: 'block\\.invalid\\/images',
                exceptions: { types: ['image'] }
            },
            {
                rule: 'block\\.invalid\\/scripts',
                exceptions: {
                    domains: ['scripts.allowed.invalid'],
                    types: ['script']
                }
            }
        ])

        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            expectedRuleset: [
                {
                    id: 1,
                    priority: BASELINE_PRIORITY,
                    action: {
                        type: 'block'
                    },
                    condition: {
                        requestDomains: [
                            'block.invalid'
                        ],
                        domainType: 'thirdParty'
                    }
                },
                // Removed as rule is redundant. Default action is block, so
                // following with a more specific block rule doesn't achieve
                // anything.
                // {
                //     id: 2,
                //     priority: BASELINE_PRIORITY +
                //               TRACKER_RULE_PRIORITY_INCREMENT,
                //     action: {
                //         type: 'block'
                //     },
                //     condition: {
                //         urlFilter: '||block.invalid/scripts',
                //         excludedInitiatorDomains: [
                //             'block.invalid'
                //         ]
                //     }
                // },
                {
                    id: 2,
                    priority: BASELINE_PRIORITY +
                              TRACKER_RULE_PRIORITY_INCREMENT,
                    action: {
                        type: 'allow'
                    },
                    condition: {
                        urlFilter: '||block.invalid/scripts',
                        isUrlFilterCaseSensitive: false,
                        resourceTypes: ['script'],
                        initiatorDomains: [
                            'scripts.allowed.invalid'
                        ]
                    }
                },
                {
                    id: 3,
                    priority: BASELINE_PRIORITY +
                              (TRACKER_RULE_PRIORITY_INCREMENT * 2),
                    action: {
                        type: 'block'
                    },
                    condition: {
                        urlFilter: '||block.invalid/images',
                        isUrlFilterCaseSensitive: false,
                        domainType: 'thirdParty'
                    }
                },
                {
                    id: 4,
                    // Note: Rule priority is not incremented for rule
                    //       exceptions since 'allow' rules trump 'block' rules
                    //       of the same priority.
                    priority: BASELINE_PRIORITY +
                              (TRACKER_RULE_PRIORITY_INCREMENT * 2),
                    action: {
                        type: 'allow'
                    },
                    condition: {
                        urlFilter: '||block.invalid/images',
                        isUrlFilterCaseSensitive: false,
                        resourceTypes: ['image']
                    }
                },
                {
                    id: 5,
                    priority: BASELINE_PRIORITY +
                              (TRACKER_RULE_PRIORITY_INCREMENT * 3),
                    action: {
                        type: 'block'
                    },
                    condition: {
                        urlFilter: '||block.invalid/domain',
                        isUrlFilterCaseSensitive: false,
                        domainType: 'thirdParty'
                    }
                },
                {
                    id: 6,
                    priority: BASELINE_PRIORITY +
                              (TRACKER_RULE_PRIORITY_INCREMENT * 3),
                    action: {
                        type: 'allow'
                    },
                    condition: {
                        urlFilter: '||block.invalid/domain',
                        isUrlFilterCaseSensitive: false,
                        initiatorDomains: [
                            'allowed.invalid'
                        ]
                    }
                }
            ]
        })
    })

    it('should normalize resourceTypes correctly', async () => {
        const blockList = emptyBlockList()
        addDomain(blockList, 'domain.invalid', 'Example entity', 'ignore', [
            {
                rule: 'domain\\.invalid\\/imageset',
                exceptions: { types: ['imageset'] }
            },
            {
                rule: 'domain\\.invalid\\/image',
                exceptions: { types: ['image'] }
            },
            {
                rule: 'domain\\.invalid\\/imageduplicate',
                exceptions: { types: ['imageset', 'image'] }
            },
            {
                rule: 'domain\\.invalid\\/other',
                exceptions: { types: ['other'] }
            },
            {
                rule: 'domain\\.invalid\\/unknownother',
                exceptions: { types: ['foobar'] }
            },
            {
                rule: 'domain\\.invalid\\/otherduplicate',
                exceptions: { types: ['foobar', 'other'] }
            },
            // 'main_frame' is stripped since main frame requests are not
            // embedded trackers, but navigations...
            {
                rule: 'domain\\.invalid\\/image_main_frame',
                exceptions: { types: ['image', 'main_frame'] }
            },
            {
                rule: 'domain\\.invalid\\/lots',
                exceptions: {
                    types: [
                        'script', 'image', 'main_frame', 'script', 'flob',
                        'sub_frame', 'object'
                    ]
                }
            }
        ])

        rulesetEqual(blockList, isRegexSupportedTrue, null, {
            rulesetTransform (ruleset) {
                return (
                    ruleset.filter(rule => rule.condition.resourceTypes)
                        .reverse()
                )
            },
            ruleTransform (rule) {
                return [
                    rule.condition.urlFilter,
                    rule.condition.resourceTypes.join(',')
                ]
            },
            expectedRuleset: [
                ['||domain.invalid/imageset', 'image'],
                ['||domain.invalid/image', 'image'],
                ['||domain.invalid/imageduplicate', 'image'],
                ['||domain.invalid/other', 'other'],
                ['||domain.invalid/unknownother', 'other'],
                ['||domain.invalid/otherduplicate', 'other'],
                ['||domain.invalid/image_main_frame', 'image'],
                ['||domain.invalid/lots', 'script,image,other,sub_frame,object']
            ]
        })
    })

    it('should map rule IDs to tracker entry domains correctly', async () => {
        const blockList = emptyBlockList()

        addDomain(blockList, 'rule.invalid', 'Rule entity', 'block', [
            {
                rule: 'rule\\.invalid\\/image',
                exceptions: { types: ['image'] }
            }
        ])
        addDomain(
            blockList, 'subdomain.rule.invalid', 'Rule entity', 'block', [
                {
                    rule: 'subdomain\\.rule\\.invalid\\/script',
                    exceptions: { types: ['script'] }
                },
                {
                    rule: 'subdomain\\.rule\\.invalid\\/stylesheet',
                    exceptions: { types: ['stylesheet'] }
                }
            ]
        )
        addDomain(
            blockList, 'another.subdomain.domain.invalid',
            'Rule entity', 'ignore'
        )

        addDomain(blockList, 'block.invalid', 'Block entity', 'block')
        addDomain(blockList, 'allow.block.invalid', 'Block entity', 'ignore')
        addDomain(blockList, 'block.block.invalid', 'Block entity', 'block')

        blockList.cnames['cname.block.invalid'] = '.rule.invalid'
        blockList.cnames['cname.allow.block.invalid'] = '.sub.rule.invalid'

        addDomain(blockList, 'another.invalid', 'Another entity', 'block')
        addDomain(blockList, 'ignored.invalid', 'Ignored entity')

        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            lookupTransform (lookup, ruleset) {
                const domains = []
                for (const rule of ruleset) {
                    domains.push(...lookup[rule.id].possibleTrackerDomains)
                }
                return domains
            },
            expectedLookup: [
                'rule.invalid',
                'rule.invalid',
                'subdomain.rule.invalid',
                'subdomain.rule.invalid',
                'subdomain.rule.invalid',
                'subdomain.rule.invalid',
                'block.invalid',
                'allow.block.invalid',
                'block.block.invalid',
                'another.invalid'
            ]
        })
    })

    it('should honour starting rule ID parameter', async () => {
        const blockList = emptyBlockList()
        addDomain(blockList, 'block.invalid', 'Block entity', 'block')
        addDomain(blockList, 'allow.block.invalid', 'Block entity', 'ignore')
        addDomain(blockList, 'block.block.invalid', 'Block entity', 'block')

        await rulesetEqual(blockList, isRegexSupportedTrue, 3333, {
            expectedLookup: {
                3333: {
                    type: 'trackerBlocking',
                    possibleTrackerDomains: ['block.invalid']
                },
                3334: {
                    type: 'trackerBlocking',
                    possibleTrackerDomains: ['allow.block.invalid']
                },
                3335: {
                    type: 'trackerBlocking',
                    possibleTrackerDomains: ['block.block.invalid']
                }
            }
        })
    })

    it('should remove redundant rules', async () => {
        const blockList = emptyBlockList()
        // Default allow action doesn't generally require a rule.
        addDomain(blockList, 'allow.invalid', 'Allow entity', 'ignore', [
            // Consecutive rules with same allow action can be removed too.
            { rule: '4', action: 'ignore' },
            { rule: '3', action: 'ignore' },
            // But once rule action is block, they can't be removed.
            { rule: '2', action: 'block' },
            { rule: '1', action: 'ignore' }
        ].reverse())

        // Default block actions do require a rule.
        addDomain(blockList, 'block.invalid', 'Block entity', 'block', [
            // But consecutive rules with block action can still be removed.
            { rule: '8', action: 'block' },
            { rule: '7', action: 'block' },
            // But once rule action is allow, they can't be removed.
            { rule: '6', action: 'allow' },
            { rule: '5', action: 'block' }
        ].reverse())

        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            ruleTransform (rule) {
                return [
                    rule.condition.urlFilter ||
                        rule.condition.requestDomains.join(','),
                    rule.action.type
                ]
            },
            expectedRuleset: [
                ['2', 'block'],
                ['1', 'allow'],
                ['block.invalid', 'block'],
                ['6', 'allow'],
                ['5', 'block']
            ]
        })
    })

    it('should combine rules where possible', async () => {
        const blockList = emptyBlockList()
        // The rules required for these tracker entries are the same except for
        // the request domains conditions. So they can be combined by combining
        // the request domains conditions.
        addDomain(blockList, 'a.invalid', 'A entity', 'block', [
            // This rule's requestDomains conditions should not be altered when
            // the other declarativeNetRequest rules are combined. There was a
            // bug in the past where that happened, this test case is designed
            // to catch that in the future.
            { rule: '1234', action: 'ignore' }
        ])
        addDomain(blockList, 'b.invalid', 'B entity', 'block')
        addDomain(blockList, 'c.invalid', 'C entity', 'block')

        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            expectedRuleset: [
                {
                    id: 1,
                    priority: BASELINE_PRIORITY,
                    action: {
                        type: 'block'
                    },
                    condition: {
                        requestDomains: [
                            'a.invalid',
                            'b.invalid',
                            'c.invalid'
                        ],
                        domainType: 'thirdParty'
                    }
                },
                {
                    id: 2,
                    priority: BASELINE_PRIORITY +
                        TRACKER_RULE_PRIORITY_INCREMENT,
                    action: {
                        type: 'allow'
                    },
                    condition: {
                        urlFilter: '1234',
                        requestDomains: [
                            'a.invalid'
                        ]
                    }
                }

            ],
            expectedLookup: {
                1: {
                    type: 'trackerBlocking',
                    possibleTrackerDomains:
                        ['a.invalid', 'b.invalid', 'c.invalid']
                },
                2: {
                    type: 'trackerBlocking',
                    possibleTrackerDomains: ['a.invalid']
                }
            }
        })
    })

    it('should strip requestDomains conditions where possible', async () => {
        const blockList = emptyBlockList()
        addDomain(blockList, 'allow.invalid', 'Example entity', 'ignore', [
            // requestDomains can be removed since urlFilter anchored to domain
            // and there's only one requestDomain.
            { rule: 'allow\\.invalid\\/path', action: 'block' },
            // urlFilter not anchored to domain so requestDomains can't be
            // removed.
            // Note: Would be nice to improve this outcome for subdomains of the
            //       request domain in the future.
            { rule: 'subdomain\\.allow\\.invalid\\/path', action: 'block' }
        ].reverse())
        // Due to the cname mapping, there are two request domains for this
        // rule. That means the requestDomains can't be removed.
        blockList.cnames['foo.invalid'] = '.subdomain.another.invalid'
        addDomain(blockList, 'another.invalid', 'Example entity', 'ignore', [
            { rule: 'another\\.invalid\\/path', action: 'block' }
        ])

        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            ruleTransform (rule) {
                return rule.condition.requestDomains
            },
            expectedRuleset: [
                undefined,
                ['allow.invalid'],
                ['another.invalid', 'foo.invalid']
            ]
        })
    })

    it('should handle domain-anchored rules for cnames where ' +
       'possible', async () => {
        const blockList = emptyBlockList()
        addDomain(blockList, 'example.invalid', 'Example entity', 'ignore', [
            // Anchored to domain, workaround is viable.
            { rule: 'example\\.invalid\\/path', action: 'block' },
            // Start of part after domain is no good, can't workaround.
            { rule: 'example\\.invalid\\.foo\\/path', action: 'block' },
            // Anchored to domain, but domain part not needed. Workaround not
            // needed.
            { rule: 'example\\.invalid.*\\/path', action: 'block' },
            // Not anchored to domain, can't workaround.
            // Note: Would be nice to handle this case for subdomains in the
            //       future.
            { rule: 'subdomain\\.example\\.invalid\\/path', action: 'block' },
            // Anchored to domain, plus regular expression is needed anyway.
            { rule: 'example\\.invalid\\/path[0-9]+', action: 'block' },
            // Not anchored to domain, so workaround won't work + regular
            // expression is required so can't fall back to urlFilter.
            { rule: 'subdomain\\.example\\.invalid\\/[0-9]+', action: 'block' }
        ].reverse())
        blockList.cnames['cname.invalid'] = '.subdomain.example.invalid'

        // With regular expression fallbacks.
        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            ruleTransform (rule) {
                return [
                    rule.condition.urlFilter || '',
                    rule.condition.regexFilter || ''
                ]
            },
            expectedRuleset: [
                ['', '[a-z]+://[^/?]*\\/path'],
                ['||example.invalid.foo/path', ''],
                ['/path', ''],
                ['subdomain.example.invalid/path', ''],
                ['', '[a-z]+://[^/?]*\\/path[0-9]+'],
                ['', 'subdomain\\.example\\.invalid\\/[0-9]+']
            ]
        })

        // Without regular expression fallbacks (or any regular expressions).
        await rulesetEqual(blockList, isRegexSupportedFalse, null, {
            ruleTransform (rule) {
                return [
                    rule.condition.urlFilter || '',
                    rule.condition.regexFilter || ''
                ]
            },
            expectedRuleset: [
                ['||example.invalid/path', ''],
                ['||example.invalid.foo/path', ''],
                ['/path', ''],
                ['subdomain.example.invalid/path', '']
            ]
        })
    })

    it('should handle surrogate rules', async () => {
        const blockList = emptyBlockList()
        addDomain(blockList, 'entity.invalid', 'Example entity', 'ignore', [
            {
                rule: 'entity\\.invalid\\/path'
            },
            {
                rule: 'entity\\.invalid\\/.*foo\\.js',
                surrogate: 'supported.js'
            },
            {
                rule: 'entity\\.invalid\\/bar\\.js',
                surrogate: 'not-supported.js'
            },
            {
                rule: 'entity\\.invalid\\/cabbage\\.js',
                surrogate: 'supported2.js',
                exceptions: { domains: ['exception.invalid'] }
            }
        ].reverse())

        await rulesetEqual(blockList, isRegexSupportedTrue, null, {
            expectedRuleset: [
                {
                    id: 1,
                    priority: BASELINE_PRIORITY +
                              TRACKER_RULE_PRIORITY_INCREMENT,
                    action: {
                        type: 'block'
                    },
                    condition: {
                        urlFilter: '||entity.invalid/path',
                        isUrlFilterCaseSensitive: false,
                        domainType: 'thirdParty'
                    }
                },
                {
                    id: 2,
                    priority: BASELINE_PRIORITY +
                              (TRACKER_RULE_PRIORITY_INCREMENT * 2),
                    action: {
                        type: 'redirect',
                        redirect: { extensionPath: '/supported.js' }
                    },
                    condition: {
                        urlFilter: '||entity.invalid/*foo.js',
                        isUrlFilterCaseSensitive: false,
                        domainType: 'thirdParty',
                        resourceTypes: ['script']
                    }
                },
                {
                    id: 3,
                    priority: BASELINE_PRIORITY +
                              (TRACKER_RULE_PRIORITY_INCREMENT * 3),
                    action: {
                        type: 'block'
                    },
                    condition: {
                        urlFilter: '||entity.invalid/bar.js',
                        isUrlFilterCaseSensitive: false,
                        domainType: 'thirdParty',
                        resourceTypes: ['script']
                    }
                },
                {
                    id: 4,
                    priority: BASELINE_PRIORITY +
                              (TRACKER_RULE_PRIORITY_INCREMENT * 4),
                    action: {
                        type: 'redirect',
                        redirect: { extensionPath: '/supported2.js' }
                    },
                    condition: {
                        urlFilter: '||entity.invalid/cabbage.js',
                        isUrlFilterCaseSensitive: false,
                        domainType: 'thirdParty',
                        resourceTypes: ['script']
                    }
                },
                {
                    id: 5,
                    priority: BASELINE_PRIORITY +
                              (TRACKER_RULE_PRIORITY_INCREMENT * 4),
                    action: {
                        type: 'allow'
                    },
                    condition: {
                        urlFilter: '||entity.invalid/cabbage.js',
                        isUrlFilterCaseSensitive: false,
                        initiatorDomains: ['exception.invalid']
                    }
                }
            ],
            expectedLookup: {
                1: {
                    type: 'trackerBlocking',
                    possibleTrackerDomains: ['entity.invalid']
                },
                2: {
                    type: 'surrogateScript',
                    possibleTrackerDomains: ['entity.invalid']
                },
                3: {
                    type: 'trackerBlocking',
                    possibleTrackerDomains: ['entity.invalid']
                },
                4: {
                    type: 'surrogateScript',
                    possibleTrackerDomains: ['entity.invalid']
                },
                5: {
                    type: 'trackerBlocking',
                    possibleTrackerDomains: ['entity.invalid']
                }
            }
        })
    })
})
