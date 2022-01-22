require('../../helpers/mock-browser-api')

const tds = require('../../../shared/js/background/trackers.es6')
const tdsStorageStub = require('../../helpers/tds.es6')
const tdsStorage = require('../../../shared/js/background/storage/tds.es6')

const tabManager = require('../../../shared/js/background/tab-manager.es6')
const browserWrapper = require('../../../shared/js/background/wrapper.es6')
const getArgumentsObject = require('../../../shared/js/background/helpers/arguments-object')

const jsCookieProtection = require('../../../shared/content-scope-scripts/src/features/tracking-cookies-1p')

const configReference = require('../../data/reference-tests/expire-1p-tracking-cookies/config_reference.json')
const blocklistReference = require('../../data/reference-tests/expire-1p-tracking-cookies/tracker_radar_reference.json')
const testSets = require('../../data/reference-tests/expire-1p-tracking-cookies/tests.json')

const jsdom = require('jsdom')
const { JSDOM } = jsdom

const EXT_ID = 'ogigmfedpbpnnbcpgjloacccaibkaoip'

for (const setName of Object.keys(testSets)) {
    const testSet = testSets[setName]

    describe(`Expire tracking 1p cookies / ${testSet.name} /`, () => {
        beforeAll(() => {
            spyOn(browserWrapper, 'getExtensionId').and.returnValue(EXT_ID)
            tdsStorageStub.stub({ config: configReference, tds: blocklistReference })

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

                const args = getArgumentsObject(1, { url: test.siteURL, frameId: 0 }, test.siteURL, 'abc123')

                const cookieJar = new jsdom.CookieJar()
                const dom = new JSDOM({
                    url: test.siteURL,
                    cookieJar
                })

                const jsdomWindow = dom.window

                jsCookieProtection.load(jsdomWindow)
                jsCookieProtection.init(args, jsdomWindow)

                jsdomWindow.document.cookie = test.cookieString

                console.warn(cookieJar.getCookieStringSync(test.siteURL))

                // if (test.expectDocumentCookieSet) {
                //     expect(cookieJar.getCookieStringSync(test.frameURL)).toEqual(test.setDocumentCookie)
                // } else {
                //     expect(cookieJar.getCookieStringSync(test.frameURL)).toEqual('')
                // }
            })
        })
    })
}
