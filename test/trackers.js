const trackers = require('../src/trackers')
const surrogates = require('../src/surrogates')

let dummyLists = {
    whitelist: `||scorecardresearch.com/sometracker.js$domain=example.com`,
    entityList: {
        'comScore': {
            'properties': [
                'comscore.com',
                'adxpose.com',
                'scorecardresearch.com',
                'sitestat.com',
                'voicefive.com'
            ],
            'resources': [
                'comscore.com',
                'adxpose.com',
                'certifica.com',
                'scorecardresearch.com',
                'sitestat.com',
                'voicefive.com',
                'mdotlabs.com',
                'proximic.com',
                'proxilinks.com',
                'proximic.net'
            ]
        }
    }
}

trackers.addLists(dummyLists)

describe('isTracker', () => {
    beforeEach(() => {
        spyOn(surrogates, 'getContentForUrl').and.returnValue(false)
    })
    describe('trackers with parent company', () => {
        let tests = [
            {
                urlToCheck: 'https://sb.scorecardresearch.com/',
                currLocation: 'https://example.com',
                expectedParentCompany: 'comScore',
                expectedUrl: 'scorecardresearch.com'
            },
            {
                urlToCheck: 'https://sb.scorecardresearch.com/p?query=string',
                currLocation: 'https://test.example.com',
                expectedParentCompany: 'comScore',
                expectedUrl: 'scorecardresearch.com'
            },
            {
                urlToCheck: 'https://foo.bar.scorecardresearch.com/p?query=string',
                currLocation: 'https://example.com',
                expectedParentCompany: 'comScore',
                expectedUrl: 'scorecardresearch.com'
            },
            {
                urlToCheck: 'https://underscore_domain.scorecardresearch.com/p?query=string',
                currLocation: 'https://example.com',
                expectedParentCompany: 'comScore',
                expectedUrl: 'scorecardresearch.com'
            }
        ]
        tests.forEach((test) => {
            it(`should block ${test.urlToCheck}`, () => {
                let tracker = trackers.isTracker(test.urlToCheck, test.currLocation, 'xhr')

                expect(tracker.block).toEqual(true)
                expect(tracker.parentCompany).toEqual(test.expectedParentCompany)
                expect(tracker.url).toEqual(test.expectedUrl)
                expect(tracker.reason).toEqual('trackersWithParentCompany')
            })
        })
    })
    describe('first party rule', () => {
        let tests = [
            {
                urlToCheck: 'https://sb.scorecardresearch.com/p?query=string',
                currLocation: 'https://comscore.com/',
                expectedParentCompany: 'comScore',
                expectedUrl: 'scorecardresearch.com'
            },
            {
                urlToCheck: 'https://sb.scorecardresearch.com/p?query=string',
                currLocation: 'https://something.or.another.comscore.com/',
                expectedParentCompany: 'comScore',
                expectedUrl: 'scorecardresearch.com'
            },
            {
                urlToCheck: 'https://sb.scorecardresearch.com/p?query=string',
                currLocation: 'https://voicefive.com/something',
                expectedParentCompany: 'comScore',
                expectedUrl: 'scorecardresearch.com'
            },
            {
                urlToCheck: 'https://sitestat.com/something.js?or=another',
                currLocation: 'https://voicefive.com/foo',
                expectedParentCompany: 'comScore',
                expectedUrl: 'sitestat.com'
            }
        ]

        tests.forEach((test) => {
            it(`should not block first party trackers on ${test.currLocation}`, () => {
                let tracker = trackers.isTracker(test.urlToCheck, test.currLocation, 'xhr')

                expect(tracker.block).toEqual(false)
                expect(tracker.parentCompany).toEqual(test.expectedParentCompany)
                expect(tracker.url).toEqual(test.expectedUrl)
                expect(tracker.reason).toEqual('first party')
            })
        })
    })
    describe('surrogates', () => {
        beforeEach(() => {
            surrogates.getContentForUrl.and.returnValue('base64encodedstring')
        })

        it(`should format tracker for surrogates correctly`, () => {
            let tracker = trackers.isTracker(
                'https://some.surrogateable.tracker.com/tracker.js',
                'https://example.com',
                'script'
            )

            expect(tracker.block).toEqual(true)
            // not on the entity list we injected
            expect(tracker.parentCompany).toEqual('unknown')
            expect(tracker.url).toEqual('some.surrogateable.tracker.com')
            expect(tracker.reason).toEqual('surrogate')
            expect(tracker.redirectUrl).toEqual('base64encodedstring')
        })
        it(`should respect first party rules`, () => {
            let tracker = trackers.isTracker(
                'https://some.surrogateable.tracker.com/tracker.js',
                'https://something.tracker.com',
                'script'
            )

            expect(tracker.block).toEqual(false)
            // not on the entity list we injected
            expect(tracker.parentCompany).toEqual('tracker.com')
            expect(tracker.url).toEqual('some.surrogateable.tracker.com')
            expect(tracker.reason).toEqual('first party')
            expect(tracker.redirectUrl).toEqual('base64encodedstring')
        })
    })
    describe('whitelist', () => {
        it(`should not block anything that's on the whitelist`, () => {
            let tracker = trackers.isTracker(
                'https://scorecardresearch.com/sometracker.js',
                'https://example.com',
                'script'
            )

            expect(tracker.block).toEqual(false)
            expect(tracker.parentCompany).toEqual('comScore')
            expect(tracker.url).toEqual('scorecardresearch.com')
            expect(tracker.reason).toEqual('whitelisted')
        })
    })
    describe('things that can\'t be blocked', () => {
        it(`should not try and block malformed urls`, () => {
            let tracker = trackers.isTracker(
                'http://%20%20s.src%20%3D/',
                'https://example.com',
                'script'
            )

            expect(tracker).toEqual(false)
        })
    })
})
