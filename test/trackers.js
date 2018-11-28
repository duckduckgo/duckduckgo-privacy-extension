const trackers = require('../src/trackers')

let dummyLists = {
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

describe('getTrackerData', () => {
    describe('trackers', () => {
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
                let tracker = trackers.getTrackerData(test.urlToCheck, test.currLocation, {url: test.currLocation, type: 'xhr'})

                expect(tracker.action).toEqual('ignore')
                expect(tracker.owner).toEqual(test.expectedParentCompany)
                expect(tracker.reason).toEqual('first party')
            })
        })
    })
})
