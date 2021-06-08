const tds = require('../../shared/js/background/trackers.es6')
const tdsStorageStub = require('./../helpers/tds.es6')
const settings = require('../../shared/js/background/settings.es6')

const refTests = require('./reference-tests.json')

describe('Tracker Utilities', () => {
    let settingsObserver
    let timer = Date.now()
    const jump = 1000 * 60 * 31 // slightly more than cache timeout

    beforeAll(() => {
        settingsObserver = spyOn(settings, 'getSetting')
        tdsStorageStub.stub()
        tds.setLists([refTests.lists])

        // Make sure we don't use any list caches for these tests
        spyOn(Date, 'now').and.callFake(function () {
            // Cache may be updated on each run, so keep jumping the time forward for each call
            timer += jump
            return timer
        })
    })

    const domainTests = refTests.tests.domainTests.tests

    it('Should identify a tracker correctly', () => {
        settings.updateSetting('trackerBlockingEnabled', true)
        settingsObserver.and.returnValue(undefined)
        for (const test of domainTests) {
            const rootURL = test.site_url
            const requestURL = test.request_url
            const requestType = test.request_type
            const result = tds.getTrackerData(requestURL, rootURL, { type: requestType })
            const action = (result && result.action)
            const reason = result && result.reason
            if (action === test.expect_action) {
                console.log(`PASS ${test.name}`)
            } else {
                console.log('ZZZ Test Case', test.name, requestURL, rootURL, test.expect_action)
                console.log('FAIL', action, reason)
            }
            expect(test.expect_action).toEqual(action)
        }
    })
})
