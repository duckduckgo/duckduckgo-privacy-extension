require('../../helpers/mock-browser-api')

const tds = require('../../../shared/js/background/trackers')
const tdsStorageStub = require('../../helpers/tds')
const tdsStorage = require('../../../shared/js/background/storage/tds').default

const tabManager = require('../../../shared/js/background/tab-manager')
const browserWrapper = require('../../../shared/js/background/wrapper')
const jsReferrerProtection = require('@duckduckgo/content-scope-scripts/src/features/referrer')

const limitReferrerData = require('../../../shared/js/background/events/referrer-trimming')

const configReference = require('@duckduckgo/privacy-reference-tests/referrer-trimming/config_reference.json')
const blocklistReference = require('@duckduckgo/privacy-reference-tests/referrer-trimming/tracker_radar_reference.json')
const testSets = require('@duckduckgo/privacy-reference-tests/referrer-trimming/tests.json')

const EXT_ID = 'ogigmfedpbpnnbcpgjloacccaibkaoip'

for (const setName of Object.keys(testSets)) {
    const testSet = testSets[setName]

    describe(`Referrer Trimming tests / ${testSet.name} /`, () => {
        beforeAll(() => {
            spyOn(browserWrapper, 'getExtensionId').and.returnValue(EXT_ID)
            tdsStorageStub.stub({ config: configReference, tds: blocklistReference })

            return tdsStorage.getLists().then(lists => tds.setLists(lists))
        })

        testSet.tests.forEach(test => {
            if (test.exceptPlatforms && test.exceptPlatforms.includes('web-extension')) {
                return
            }

            if ('expectReferrerHeaderValue' in test) {
                it(`${test.name}`, () => {
                    tabManager.delete(1)
                    tabManager.create({
                        tabId: 1,
                        url: test.navigatingFromUrl || test.siteURL
                    })

                    const requestChanges = limitReferrerData({
                        tabId: 1,
                        url: test.navigatingToURL || test.requestURL,
                        requestHeaders: [
                            { name: 'something', value: 'else' },
                            { name: 'referer', value: test.referrerValue }
                        ],
                        type: test.requestType || 'main_frame'
                    })

                    let refererHeaderValueAfter = test.referrerValue

                    if (requestChanges && requestChanges.requestHeaders) {
                        refererHeaderValueAfter = requestChanges.requestHeaders.find(h => h.name === 'referer')?.value
                    }

                    expect(refererHeaderValueAfter).toEqual(test.expectReferrerHeaderValue)
                })
            } else if ('expectReferrerAPIValue' in test) {
                it(`${test.name}`, () => {
                    tabManager.delete(1)
                    tabManager.create({
                        tabId: 1,
                        url: test.siteURL
                    })

                    limitReferrerData({
                        tabId: 1,
                        url: test.siteURL,
                        requestHeaders: [
                            { name: 'something', value: 'else' },
                            { name: 'referer', value: test.referrerValue }
                        ],
                        type: 'main_frame'
                    })

                    if ('frameURL' in test) {
                        limitReferrerData({
                            tabId: 1,
                            url: test.frameURL,
                            requestHeaders: [
                                { name: 'referer', value: test.referrerValue }
                            ],
                            type: 'sub_frame'
                        })
                    }

                    const tab = tabManager.get({ tabId: 1 })

                    const FakeDocument = function () {}
                    FakeDocument.prototype.referrer = test.referrerValue
                    FakeDocument.prototype.location = {
                        url: test.frameURL || test.siteURL
                    }
                    const orgDocument = globalThis.Document

                    // replacing real document and Document with fake ones
                    globalThis.Document = FakeDocument
                    spyOnProperty(document, 'referrer', 'get').and.returnValue(test.referrerValue)

                    jsReferrerProtection.init({ referrer: tab.referrer })

                    // clean up
                    globalThis.Document = orgDocument

                    expect(FakeDocument.prototype.referrer).toEqual(test.expectReferrerAPIValue)
                })
            } else {
                throw new Error(`Unknown type of test - ${test.name}`)
            }
        })
    })
}
