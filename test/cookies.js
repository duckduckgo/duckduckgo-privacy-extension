const assert = require('assert')
const { generateCookieBlockingRuleset } = require('../lib/cookies.js')

/** @type {import('../lib/utils.js').TDS} */
const mockTds = {
    trackers: {
        'tracker.com': {
            domain: 'tracker.com',
            owner: {
                name: 'TRACKER INC.',
                displayName: ''
            },
            default: 'block',
            cookies: 0,
            fingerprinting: 0,
            prevalence: 0.1,
            categories: [],
            rules: []
        },
        'track-the-things.com': {
            domain: 'track-the-things.com',
            owner: {
                name: 'MultiTracker Inc.',
                displayName: ''
            },
            default: 'block',
            cookies: 0,
            fingerprinting: 0,
            prevalence: 0.1,
            categories: [],
            rules: []
        },
        'track-more.com': {
            domain: 'track-more.com',
            owner: {
                name: 'MultiTracker Inc.',
                displayName: ''
            },
            default: 'block',
            cookies: 0,
            fingerprinting: 0,
            prevalence: 0.1,
            categories: [],
            rules: []
        },
        'sub.example.com': {
            domain: 'sub.example.com',
            owner: {
                name: 'Example.com',
                displayName: ''
            },
            default: 'block',
            cookies: 0,
            fingerprinting: 0,
            prevalence: 0.1,
            categories: [],
            rules: []
        }
    },
    entities: {
        'TRACKER INC.': {
            domains: [
                'tracker.com'
            ],
            prevalence: 0,
            displayName: ''
        },
        'MultiTracker Inc.': {
            domains: [
                'track-the-things.com',
                'track-more.com',
                'track-homepage.com'
            ],
            prevalence: 0,
            displayName: ''
        },
        'Example.com': {
            domains: [
                'example.com'
            ],
            prevalence: 0,
            displayName: ''
        }
    },
    cnames: {
        'track.example.com': 'example.track-the-things.com'
    }
}

describe('cookie rules', () => {
    describe('generateCookieBlockingRuleset', () => {
        it('empty tds generates 0 rules', () => {
            const { ruleset } = generateCookieBlockingRuleset({
                trackers: {},
                entities: {},
                cnames: {}
            }, [], [])
            assert.equal(ruleset.length, 0)
        })

        it('generates a block rule with entity domains included (including CNAMEs)', () => {
            const { ruleset } = generateCookieBlockingRuleset(mockTds, [], [])
            const trackerRule = ruleset.find(rule => rule.condition.requestDomains?.includes('track-the-things.com'))
            assert.ok(!!trackerRule)
            assert.deepEqual(trackerRule.condition.requestDomains, ['track-the-things.com', 'track.example.com', 'track-more.com'])
            assert.deepEqual(trackerRule.condition.excludedInitiatorDomains, ['track-the-things.com', 'track.example.com', 'track-more.com', 'track-homepage.com'])
        })

        it('excludedCookieDomains: removes a domain from the rules', () => {
            const { ruleset } = generateCookieBlockingRuleset(mockTds, ['broken.track-more.com'], [])
            const trackerRule = ruleset.find(rule => rule.condition.requestDomains?.includes('track-the-things.com'))
            assert.ok(!!trackerRule)
            assert.deepEqual(trackerRule.condition.requestDomains, ['track-the-things.com', 'track.example.com', 'track-more.com'])
            assert.deepEqual(trackerRule.condition.excludedInitiatorDomains, ['track-the-things.com', 'track.example.com', 'track-more.com', 'track-homepage.com'])
            assert.deepEqual(trackerRule.condition.excludedRequestDomains, ['broken.track-more.com'])
            // check that this exclusion isn't added to irrelevant rules
            const otherRule = ruleset.find(rule => rule.condition.requestDomains?.includes('tracker.com'))
            assert.deepEqual(otherRule?.condition.excludedRequestDomains || [], [])
        })

        it('site allowlist domains are added to every rule', () => {
            const { ruleset } = generateCookieBlockingRuleset(mockTds, [], ['safe.site'])
            assert.ok(ruleset.every(r => r.condition.excludedInitiatorDomains?.includes('safe.site')))
        })

        it('groups single domain entities', () => {
            const { ruleset } = generateCookieBlockingRuleset(mockTds, [], [])
            const thirdPartyRules = ruleset.filter(r => r.condition.domainType === 'thirdParty')
            assert.equal(thirdPartyRules.length, 1)
            assert.deepEqual(thirdPartyRules[0].condition.requestDomains, ['tracker.com'])
        })

        it('handles not eTLD+1 trackers', () => {
            const { ruleset } = generateCookieBlockingRuleset(mockTds, [], [])
            const exampleRule = ruleset.find(r => r.condition.requestDomains?.includes('sub.example.com'))
            assert.ok(!!exampleRule)
            assert.deepEqual(exampleRule.condition.requestDomains, ['sub.example.com'])
            assert.deepEqual(exampleRule.condition.excludedInitiatorDomains, ['sub.example.com', 'example.com'])
        })
    })

    describe('matchDetailsByRuleId', function () {
        it('returns a list of possible domains for a matched rule', async function () {
            const { ruleset, matchDetailsByRuleId } = generateCookieBlockingRuleset(mockTds, [], [])
            await this.browser.addRules(ruleset)
            const matchedRules = await this.browser.testMatchOutcome({
                url: 'https://tracker.com/pixel',
                initiator: 'https://www.example.com/',
                type: 'xmlhttprequest',
                tabId: 1
            })
            assert.equal(matchedRules.length, 1)
            assert.ok(matchDetailsByRuleId[matchedRules[0].id].possibleTrackerDomains?.includes('tracker.com'))
        })
    })
})
