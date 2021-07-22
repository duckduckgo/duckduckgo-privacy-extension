const allowList = require('../../shared/js/background/allowtrackers.es6')
// const refTests = require('./reference-tests/tracker-radar-tests/TR-domain-matching/domain_matching_tests.json')

const allowListTests = {
    trackerAllowlistTests: {
        tests: [
            {
                name: 'allow single resource on single site',
                site: 'https://testsite.com',
                request: 'https://allowlist-tracker-1.com/videos.js',
                isAllowlisted: true
            },
            {
                name: 'should not match on a site not listed in the allowlist entry domains list',
                site: 'https://testsite2.com',
                request: 'https://allowlist-tracker-1.com/videos.js',
                isAllowlisted: false
            },
            {
                name: 'should match on ',
                site: 'https://testsite2.com',
                request: 'https://allowlist-tracker-1.com/videos.js',
                isAllowlisted: false
            }
        ]
    }
}

describe('Tracker allowlist  tests:', () => {
    // const allowListTests = refTests.trackerAllowlistTests.tests

    allowListTests.trackerAllowlistTests.tests.forEach(test => {
        const result = allowList(test.site, test.request)
        it(`${test.name}`, () => {
            expect(test.isAllowlisted).toEqual(!!result)
        })
    })
})
