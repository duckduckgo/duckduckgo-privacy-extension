const Trackers = require('../src/classes/trackers')
const trackerLists = require('./data/tracker-lists')
const tldts = require('tldts')
const utils = require('../src/utils')

const trackers = new Trackers({ tldjs: tldts, utils: utils })
trackers.setLists([
    {
        name: 'tds',
        data: {
            entities: trackerLists.entityList,
            trackers: trackerLists.trackerList
        }
    },
    {
        name: 'surrogates',
        data: trackerLists.surrogates
    }
])

describe('getTrackerData', () => {
    describe('find tracker data', () => {
        const trackerTests = [
            // matched rule with no exceptions or first party => block
            {
                action: 'block',
                urlToCheck: 'https://geo.yahoo.com/asdf',
                siteUrl: 'https://example.com',
                requestType: 'image',
                expectedOwner: 'Oath',
                expectedReason: 'matched rule - block',
                firstParty: false,
                expectedRule: 'geo\\.yahoo\\.com',
                redirectUrl: false,
                matchedRuleException: false
            },
            // request from a site owned by the same company => ignore
            {
                action: 'ignore',
                urlToCheck: 'https://geo.yahoo.com/asdf',
                siteUrl: 'https://news.aol.com',
                requestType: 'image',
                expectedOwner: 'Oath',
                expectedReason: 'first party',
                firstParty: true,
                expectedRule: 'geo\\.yahoo\\.com',
                redirectUrl: false,
                matchedRuleException: false
            },
            // matched a rule with a surrogate => rediect
            {
                action: 'redirect',
                urlToCheck: 'https://ads.a.yahoo.com/?b=asdf',
                siteUrl: 'https://example.com',
                requestType: 'image',
                expectedOwner: 'Oath',
                expectedReason: 'matched rule - surrogate',
                firstParty: false,
                expectedRule: 'a\\.yahoo\\.com($|[?/])',
                redirectUrl: 'data:application/javascript;base64,KGZ1bmN0aW9uKCkge30p',
                matchedRuleException: false
            },
            // request matches a rule exception => ignore
            {
                action: 'ignore',
                urlToCheck: 'https://ads.a.yahoo.com/?b=asdf',
                siteUrl: 'https://a.example2.com',
                requestType: 'image',
                expectedOwner: 'Oath',
                expectedReason: 'matched rule - exception',
                firstParty: false,
                expectedRule: 'a\\.yahoo\\.com($|[?/])',
                redirectUrl: 'data:application/javascript;base64,KGZ1bmN0aW9uKCkge30p',
                matchedRuleException: true
            },
            // request from the same domain => ignore
            {
                action: 'ignore',
                urlToCheck: 'https://ads.a.yahoo.com/?b=asdf',
                siteUrl: 'https://news.yahoo.com',
                requestType: 'image',
                expectedOwner: 'Oath',
                expectedReason: 'first party',
                firstParty: true,
                expectedRule: 'a\\.yahoo\\.com($|[?/])',
                redirectUrl: 'data:application/javascript;base64,KGZ1bmN0aW9uKCkge30p',
                matchedRuleException: false
            },
            // rule with a action 'ignore' => ignore
            {
                action: 'ignore',
                urlToCheck: 'https://b.yahoo.com/ads?ad=asdf',
                siteUrl: 'https://example.com',
                requestType: 'image',
                expectedOwner: 'Oath',
                expectedReason: 'matched rule - ignore',
                firstParty: false,
                expectedRule: 'b\\.yahoo\\.com\\/.*\\?ad=asdf',
                redirectUrl: false,
                matchedRuleException: false
            },
            // request without a rule, tracker definition default action is block => block
            {
                action: 'block',
                urlToCheck: 'https://asdf.yahoo.com/tracker1/asdf',
                siteUrl: 'https://example.com',
                requestType: 'script',
                expectedOwner: 'Oath',
                expectedReason: 'default block',
                firstParty: false,
                expectedRule: null,
                redirectUrl: false,
                matchedRuleException: false
            },
            // tracker with default ignore => ignore
            {
                action: 'ignore',
                urlToCheck: 'https://example.com/tracker1/asdf',
                siteUrl: 'https://aol.com',
                requestType: 'script',
                expectedOwner: 'Example',
                expectedReason: 'default ignore',
                firstParty: false,
                expectedRule: null,
                redirectUrl: false,
                matchedRuleException: false
            }
        ]

        trackerTests.forEach((test) => {
            it(`should block ${test.urlToCheck}`, () => {
                const tracker = trackers.getTrackerData(
                    test.urlToCheck,
                    test.siteUrl,
                    { url: test.urlToCheck, type: test.requestType })

                expect(tracker.action).toEqual(test.action)
                expect(tracker.reason).toEqual(test.expectedReason)

                if (test.expectedRule) {
                    expect(tracker.matchedRule.rule.toString()).toEqual(new RegExp(test.expectedRule, 'gi').toString())
                }

                expect(tracker.firstParty).toEqual(test.firstParty)
                expect(tracker.redirectUrl).toEqual(test.redirectUrl)
                expect(tracker.matchedRuleException).toEqual(test.matchedRuleException)
            })
        })

        const nonTrackerTests = [
            // non tracker requests
            {
                urlToCheck: 'http://somecdn.com/jquery',
                siteUrl: 'https://example.com',
                requestType: 'script'
            },
            // malformed urls
            {
                urlToCheck: 'http://%20%20s.src%20%3D/',
                siteUrl: 'https://example.com',
                requestType: 'image'
            }
        ]

        nonTrackerTests.forEach((test) => {
            it(`should not block ${test.urlToCheck}`, () => {
                const tracker = trackers.getTrackerData(
                    test.urlToCheck,
                    test.siteUrl,
                    { url: test.urlToCheck, type: test.requestType })

                expect(tracker.action).toEqual(null)
            })
        })
    })
})
