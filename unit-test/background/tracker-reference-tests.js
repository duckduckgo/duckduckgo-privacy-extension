const tds = require('../../shared/js/background/trackers.es6')
const tdsStorageStub = require('./../helpers/tds.es6')
const settings = require('../../shared/js/background/settings.es6')

const trackers = require('./reference-tests/tracker-radar-tests/TR-domain-matching/tracker_radar_reference.json')
const refTests = require('./reference-tests/tracker-radar-tests/TR-domain-matching/domain_matching_tests.json')

describe('Tracker reference tests:', () => {
    let settingsObserver
    let timer = Date.now()
    const jump = 1000 * 60 * 31 // slightly more than cache timeout

    beforeAll(() => {
        settingsObserver = spyOn(settings, 'getSetting')
        tdsStorageStub.stub()
        const testLists = [{
            name: 'tds',
            data: trackers
        }]
        tds.setLists(testLists)

        // Make sure we don't use any list caches for these tests
        spyOn(Date, 'now').and.callFake(function () {
            // Cache may be updated on each run, so keep jumping the time forward for each call
            timer += jump
            return timer
        })

        settings.updateSetting('trackerBlockingEnabled', true)
        settingsObserver.and.returnValue(undefined)
    })

    const domainTests = refTests.domainTests.tests

    for (const test of domainTests) {
        it(`${test.name}`, () => {
            const rootURL = test.siteURL
            const requestURL = test.requestURL
            const requestType = test.requestType
            const result = tds.getTrackerData(requestURL, rootURL, { type: requestType })
            const action = (result && result.action)
            expect(test.expectAction).toEqual(action)
        })
    }
})
