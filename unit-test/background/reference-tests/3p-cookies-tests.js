require('../../helpers/mock-browser-api')

const trackers = require('../../../shared/js/background/trackers')
const tdsStorageStub = require('../../helpers/tds')
const tdsStorage = require('../../../shared/js/background/storage/tds').default

const tabManager = require('../../../shared/js/background/tab-manager')
const browserWrapper = require('../../../shared/js/background/wrapper')
const { dropTracking3pCookiesFromResponse, dropTracking3pCookiesFromRequest } = require('../../../shared/js/background/events/3p-tracking-cookie-blocking')
const getArgumentsObject = require('../../../shared/js/background/helpers/arguments-object')

const jsdom = require('jsdom')

const trackingJsCookieProtection = require('@duckduckgo/content-scope-scripts/src/features/cookie')

const trackingConfigReference = require('@duckduckgo/privacy-reference-tests/block-third-party-tracking-cookies/config_reference.json')
const trackingBlocklistReference = require('@duckduckgo/privacy-reference-tests/block-third-party-tracking-cookies/tracker_radar_reference.json')
const trackingTestSets = require('@duckduckgo/privacy-reference-tests/block-third-party-tracking-cookies/tests.json')
const constants = require('../../../shared/data/constants')

const { JSDOM } = jsdom

const EXT_ID = 'ogigmfedpbpnnbcpgjloacccaibkaoip'
const orgGlobalThis = globalThis

function runTestSuite (suiteType, testSet, jsCookieProtection, configReference, blocklistReference) {
    describe(`Third party ${suiteType} cookies blocking tests / ${testSet.name} /`, () => {
        beforeAll(() => {
            spyOn(browserWrapper, 'getExtensionId').and.returnValue(EXT_ID)
            tdsStorageStub.stub({ config: configReference, tds: blocklistReference })

            return tdsStorage.getLists().then(lists => trackers.setLists(lists))
        })

        afterEach(() => {
            // eslint-disable-next-line no-global-assign
            globalThis = orgGlobalThis
        })

        testSet.tests.forEach(test => {
            if (test.exceptPlatforms && test.exceptPlatforms.includes('web-extension')) {
                return
            }

            if ('expectSetCookieHeadersRemoved' in test || 'expectCookieHeadersRemoved' in test) {
                it(`${test.name}`, () => {
                    tabManager.delete(1)
                    tabManager.create({
                        tabId: 1,
                        url: test.siteURL
                    })

                    if ('expectSetCookieHeadersRemoved' in test) {
                        const outputRequest = dropTracking3pCookiesFromResponse({
                            tabId: 1,
                            initiator: test.siteURL,
                            url: test.requestURL,
                            responseHeaders: test.responseHeaders,
                            type: 'script'
                        })

                        if (test.expectCookieHeadersRemoved) {
                            const headersAreRemoved = outputRequest?.responseHeaders.find(h => h.name.toLocaleLowerCase() === 'set-cookie') === undefined
                            expect(headersAreRemoved).toBe(test.expectSetCookieHeadersRemoved)
                        } else {
                            expect(outputRequest).toBeFalsy()
                        }
                    } else if ('expectCookieHeadersRemoved' in test) {
                        const outputRequest = dropTracking3pCookiesFromRequest({
                            tabId: 1,
                            initiator: test.siteURL,
                            url: test.requestURL,
                            requestHeaders: test.requestHeaders,
                            type: 'script'
                        })

                        if (test.expectCookieHeadersRemoved) {
                            const headersAreRemoved = outputRequest?.requestHeaders.find(h => h.name.toLocaleLowerCase() === 'cookie') === undefined
                            expect(headersAreRemoved).toBe(test.expectCookieHeadersRemoved)
                        } else {
                            expect(outputRequest).toBeFalsy()
                        }
                    }
                })
            } else if ('expectDocumentCookieSet' in test) {
                it(`${test.name}`, () => {
                    tabManager.delete(1)
                    tabManager.create({
                        tabId: 1,
                        url: test.siteURL
                    })

                    const args = getArgumentsObject(1, { url: test.frameURL || test.siteURL, frameId: test.frameURL ? 1 : 0 }, test.frameURL || test.siteURL, 'abc123')

                    const cookieJar = new jsdom.CookieJar()
                    const dom = new JSDOM(`<iframe src="${test.frameURL}"></iframe>`, {
                        url: test.siteURL,
                        cookieJar
                    })

                    // protection only works in an iframe
                    const jsdomWindow = dom.window.frames[0].window

                    // eslint-disable-next-line no-global-assign
                    globalThis = jsdomWindow

                    jsCookieProtection.load({
                        platform: constants.platform
                    })
                    jsCookieProtection.init(args)

                    jsdomWindow.document.cookie = test.setDocumentCookie

                    if (test.expectDocumentCookieSet) {
                        expect(cookieJar.getCookieStringSync(test.frameURL)).toEqual(test.setDocumentCookie)
                    } else {
                        expect(cookieJar.getCookieStringSync(test.frameURL)).toEqual('')
                    }
                })
            } else {
                throw new Error(`Unknown type of test - ${test.name}`)
            }
        })
    })
}

for (const setName of Object.keys(trackingTestSets)) {
    const testSet = trackingTestSets[setName]

    runTestSuite('tracking', testSet, trackingJsCookieProtection, trackingConfigReference, trackingBlocklistReference)
}
