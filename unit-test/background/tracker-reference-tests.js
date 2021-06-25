const tds = require('../../shared/js/background/trackers.es6')
const tdsStorageStub = require('./../helpers/tds.es6')
const settings = require('../../shared/js/background/settings.es6')

const trackers = require('./reference-tests/TR-domain-matching/tracker_radar_reference.json')
const refTests = require('./reference-tests/TR-domain-matching/domain_matching_tests.json')

describe('Tracker Utilities', () => {
    let settingsObserver
    let timer = Date.now()
    const jump = 1000 * 60 * 31 // slightly more than cache timeout

    beforeAll(() => {
        settingsObserver = spyOn(settings, 'getSetting')
        tdsStorageStub.stub()
        tds.setLists([trackers])

        // Make sure we don't use any list caches for these tests
        spyOn(Date, 'now').and.callFake(function () {
            // Cache may be updated on each run, so keep jumping the time forward for each call
            timer += jump
            return timer
        })
    })

    const domainTests = refTests.domainTests.tests

    it('Should identify a tracker correctly', () => {
        settings.updateSetting('trackerBlockingEnabled', true)
        settingsObserver.and.returnValue(undefined)
        for (const test of domainTests) {
            const rootURL = test.siteURL
            const requestURL = test.requestURL
            const requestType = test.requestType
            const result = tds.getTrackerData(requestURL, rootURL, { type: requestType })
            const action = (result && result.action)
            const reason = result && result.reason
            if (action === test.expectAction) {
                console.log(`PASS ${test.name}`)
            } else {
                console.log('FAIL Test Case', test.name, requestURL, rootURL)
                console.log(`-- expected ${test.expectAction}, got ${action}, reason ${reason}`)
            }
            expect(test.expectAction).toEqual(action)
        }
    })
})
