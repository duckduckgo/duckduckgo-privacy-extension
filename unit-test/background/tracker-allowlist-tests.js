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
                name: 'should match on all subdomains of an allowlisted site',
                site: 'https://a.b.c.testsite.com',
                request: 'https://allowlist-tracker-1.com/videos.js',
                isAllowlisted: true
            },
            {
                name: 'should match on all subdomains of an allowlisted tracker',
                site: 'https://testsite.com',
                request: 'https://a.b.c.allowlist-tracker-1.com/videos.js',
                isAllowlisted: true
            },
            {
                name: 'should not match on a substring of the domain',
                site: 'https://anothertestsite.com',
                request: 'https://allowlist-tracker-1.com/videos.js',
                isAllowlisted: false
            },
            {
                name: 'should not match on a site not listed in the allowlist entry domains list',
                site: 'https://testsite2.com',
                request: 'https://allowlist-tracker-1.com/videos.js',
                isAllowlisted: false
            },
            {
                name: 'should match query strings',
                site: 'https://testsite.com',
                request: 'https://allowlist-tracker-1.com/videos.js?a=123&b=456',
                isAllowlisted: true
            },
            {
                name: 'should match random paths',
                site: 'https://someothersite.com',
                request: 'https://allowlist-tracker-2.com/comments/1234asdf/comment.js',
                isAllowlisted: true
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
