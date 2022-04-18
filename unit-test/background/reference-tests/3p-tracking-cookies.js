require('../../helpers/mock-browser-api')

const tds = require('../../../shared/js/background/trackers.es6')
const tdsStorageStub = require('../../helpers/tds.es6')
const tdsStorage = require('../../../shared/js/background/storage/tds.es6')

const tabManager = require('../../../shared/js/background/tab-manager.es6')
const browserWrapper = require('../../../shared/js/background/wrapper.es6')
const { dropTracking3pCookiesFromResponse, dropTracking3pCookiesFromRequest } = require('../../../shared/js/background/events/3p-tracking-cookie-blocking')
const getArgumentsObject = require('../../../shared/js/background/helpers/arguments-object')

const jsCookieProtection = require('../../../shared/content-scope-scripts/src/features/tracking-cookies-3p')

const configReference = require('../../data/reference-tests/block-third-party-tracking-cookies/config_reference.json')
const blocklistReference = require('../../data/reference-tests/block-third-party-tracking-cookies/tracker_radar_reference.json')
const testSets = require('../../data/reference-tests/block-third-party-tracking-cookies/tests.json')

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

                        const headersAreRemoved = outputRequest.responseHeaders.find(h => h.name.toLocaleLowerCase() === 'set-cookie') === undefined

                        expect(headersAreRemoved).toBe(test.expectSetCookieHeadersRemoved)
                    } else if ('expectCookieHeadersRemoved' in test) {
                        const outputRequest = dropTracking3pCookiesFromRequest({
                            tabId: 1,
                            initiator: test.siteURL,
                            url: test.requestURL,
                            requestHeaders: test.requestHeaders,
                            type: 'script'
                        })

                        const headersAreRemoved = outputRequest.requestHeaders.find(h => h.name.toLocaleLowerCase() === 'cookie') === undefined

                        expect(headersAreRemoved).toBe(test.expectCookieHeadersRemoved)
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

                    let cookieJar = ''

                    const orgDocument = globalThis.document
                    globalThis.document = {cookie:{}}

                    const spyCookieSet = spyOnProperty(document, 'cookie', 'set').and.callFake(args => (cookieJar += args))
                    const spyCookieGet = spyOnProperty(document, 'cookie', 'get').and.callFake(() => cookieJar)

                    jsCookieProtection.init(args)

                    document.cookie = test.setDocumentCookie

                    globalThis.document = orgDocument

                    if (test.expectDocumentCookieSet) {
                        expect(cookieJar).toEqual(test.setDocumentCookie)
                    } else {
                        expect(cookieJar).toEqual('')
                    }
                })
            } else {
                throw new Error(`Unknown type of test - ${test.name}`)
            }
        })
    })
}
