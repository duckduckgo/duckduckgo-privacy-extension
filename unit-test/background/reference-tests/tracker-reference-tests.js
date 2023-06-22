import refSurrogates from '@duckduckgo/privacy-reference-tests/tracker-radar-tests/TR-domain-matching/surrogates.txt'

const tds = require('../../../shared/js/background/trackers')
const tdsStorageStub = require('../../helpers/tds')

const refTrackers = require('@duckduckgo/privacy-reference-tests/tracker-radar-tests/TR-domain-matching/tracker_radar_reference.json')
const refTests = require('@duckduckgo/privacy-reference-tests/tracker-radar-tests/TR-domain-matching/domain_matching_tests.json')

describe('Tracker reference tests:', () => {
    beforeAll(() => {
        tdsStorageStub.stub()

        const testLists = [{
            name: 'tds',
            data: refTrackers
        },
        {
            name: 'surrogates',
            data: refSurrogates
        }]
        return tds.setLists(testLists)
    })

    const domainTests = refTests.domainTests.tests
    const surrogateTests = refTests.surrogateTests.tests
    const tests = domainTests.concat(surrogateTests)

    for (const test of tests) {
        if (test.exceptPlatforms?.includes('web-extension')) {
            continue
        }

        it(`${test.name}`, () => {
            const rootURL = test.siteURL
            const requestURL = test.requestURL
            const requestType = test.requestType
            const expectRedirect = test.expectRedirect
            const result = tds.getTrackerData(requestURL, rootURL, { type: requestType })
            let action = (result && result.action)
            if (action === 'none') {
                action = null
            }
            expect(action).toEqual(test.expectAction)
            if (expectRedirect) {
                expect(result.redirectUrl).toEqual(expectRedirect)
            }
        })
    }
})
