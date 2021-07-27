const refTests = require('./reference-tests/tracker-radar-tests/TR-domain-matching/tracker_allowlist_matching_tests.json')
const allowList = require('./../..//shared/js/background/allowlisted-trackers.es6')

describe('Tracker allowlist  tests:', () => {
    // const allowListTests = refTests.trackerAllowlistTests.tests

    refTests.forEach(test => {
        const result = allowList(test.site, test.request)
        it(`${test.description}`, () => {
            expect(test.isAllowlisted).toEqual(!!result)
        })
    })
})
