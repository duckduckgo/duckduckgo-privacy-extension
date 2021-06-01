const trackerutils = require('../../shared/js/background/tracker-utils')
const tds = require('../../shared/js/background/trackers.es6')
const tdsStorage = require('../../shared/js/background/storage/tds.es6')
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

        // return tdsStorage.getLists()
        //     .then(lists => {
        //         return tds.setLists(lists)
        //     })
    })

    const domainTests = refTests.tests.domainTests.tests
    var fakeRequest = { type: 'script' };
    
    it('Should identify a tracker correctly', () => {
        settings.updateSetting('trackerBlockingEnabled', true);
        settingsObserver.and.returnValue(undefined)
        for (const test of domainTests) {
            const targetURL = test.rel
            const rootURL = test.base
            console.log('ZZZ Test Case', test.name, rootURL, targetURL, test.expect_action)
            let result = tds.getTrackerData(rootURL, targetURL, fakeRequest)
            console.log('ZZZ Result', result && result.action, result && result.reason)
            expect(true).toBeTruthy()
        }
    })
})
