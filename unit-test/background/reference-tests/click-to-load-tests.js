require('../../helpers/mock-browser-api')

const tds = require('../../../shared/js/background/trackers.es6')
const tdsStorageStub = require('../../helpers/tds.es6')
const tdsStorage = require('../../../shared/js/background/storage/tds.es6')

const ctlConfigReference = require('../../data/reference-tests/click-to-load/click_to_load_config_reference.json')
const blocklistReference = require('../../data/reference-tests/click-to-load/tracker_radar_reference.json')
const testSets = require('../../data/reference-tests/click-to-load/tests.json')

const redirect = require('../../../shared/js/background/redirect.es6')
const tabManager = require('../../../shared/js/background/tab-manager.es6')

for (const setName of Object.keys(testSets)) {
    const testSet = testSets[setName]

    describe(`Click to load tests / ${testSet.name} /`, () => {
        beforeAll(() => {
            tdsStorageStub.stub({ ClickToLoadConfig: ctlConfigReference, tds: blocklistReference })

            return tdsStorage.getLists().then(lists => tds.setLists(lists))
        })

        testSet.tests.forEach(test => {
            if (test.exceptPlatforms && test.exceptPlatforms.includes('web-extension')) {
                return
            }

            it(`${test.name}`, () => {
                tabManager.delete(1)
                tabManager.create({
                    tabId: 1,
                    url: test.siteURL
                })
                const tab = tabManager.get({ tabId: 1 })

                if (test.userUnblocked) {
                    const tracker = tds.getTrackerData(test.requestURL, test.siteURL, { type: 'script' })
                    tab.site.clickToLoad.push(tracker.tracker.owner.name)
                }

                const result = redirect.handleRequest({
                    tabId: 1,
                    url: test.requestURL,
                    type: 'script'
                })

                let action = 'ignore'

                if (result && result.cancel) {
                    action = 'block'
                } else if (result && result.redirectUrl) {
                    action = 'redirect'
                }

                expect(action).toEqual(test.expectAction)
            })
        })
    })
}
