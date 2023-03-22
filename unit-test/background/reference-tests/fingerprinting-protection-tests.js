require('../../helpers/mock-browser-api')

const tds = require('../../../shared/js/background/trackers')
const tdsStorageStub = require('../../helpers/tds')
const tdsStorage = require('../../../shared/js/background/storage/tds').default

const tabManager = require('../../../shared/js/background/tab-manager')
const browserWrapper = require('../../../shared/js/background/wrapper')
const getArgumentsObject = require('../../../shared/js/background/helpers/arguments-object')

const batteryProtection = require('@duckduckgo/content-scope-scripts/src/features/fingerprinting-battery')
const hardwareProtection = require('@duckduckgo/content-scope-scripts/src/features/fingerprinting-hardware')
const screenProtection = require('@duckduckgo/content-scope-scripts/src/features/fingerprinting-screen-size')
const tempStorageProtection = require('@duckduckgo/content-scope-scripts/src/features/fingerprinting-temporary-storage')
const { isFeatureBroken } = require('@duckduckgo/content-scope-scripts/src/utils')

const configReference = require('@duckduckgo/privacy-reference-tests/fingerprinting-protections/config_reference.json')
const testSets = require('@duckduckgo/privacy-reference-tests/fingerprinting-protections/tests.json')
const apiMocksInit = require('@duckduckgo/privacy-reference-tests/fingerprinting-protections/init')

const jsdom = require('jsdom')
const { JSDOM } = jsdom

const EXT_ID = 'ogigmfedpbpnnbcpgjloacccaibkaoip'
const orgGlobalThis = globalThis

for (const setName of Object.keys(testSets)) {
    const testSet = testSets[setName]

    describe(`Fingerprinting protection tests / ${testSet.name} /`, () => {
        beforeAll(() => {
            spyOn(browserWrapper, 'getExtensionId').and.returnValue(EXT_ID)
            tdsStorageStub.stub({ config: configReference })

            return tdsStorage.getLists().then(lists => tds.setLists(lists))
        })

        afterEach(() => {
            // eslint-disable-next-line no-global-assign
            globalThis = orgGlobalThis
        })

        testSet.tests.forEach(test => {
            if (test.exceptPlatforms && test.exceptPlatforms.includes('web-extension')) {
                return
            }

            it(`${test.name}`, (done) => {
                tabManager.delete(1)
                tabManager.create({
                    tabId: 1,
                    url: test.siteURL
                })

                const args = getArgumentsObject(1, { url: test.siteURL, frameId: 0 }, test.siteURL, 'abc123')
                const dom = new JSDOM('', {
                    url: 'https://example.com/',
                    runScripts: 'outside-only'
                })

                // mock non-standard APIs not implemented by jsdom
                apiMocksInit(dom.window)

                // eslint-disable-next-line no-global-assign
                globalThis = dom.window

                // init protections
                if (!isFeatureBroken(args, 'fingerprintingBattery')) {
                    batteryProtection.init(args)
                }
                if (!isFeatureBroken(args, 'fingerprintingHardware')) {
                    hardwareProtection.init(args)
                }
                if (!isFeatureBroken(args, 'fingerprintingScreenSize')) {
                    screenProtection.init(args)
                }
                if (!isFeatureBroken(args, 'fingerprintingTemporaryStorage')) {
                    tempStorageProtection.init(args)
                }

                // validate result
                const result = dom.window.eval(test.property)

                function check (resultValue) {
                    const resultString = resultValue === undefined ? 'undefined' : resultValue.toString()
                    expect(resultString).toBe(test.expectPropertyValue)
                    done()
                }

                if (result instanceof Promise) {
                    result.then(check)
                } else {
                    check(result)
                }
            })
        })
    })
}
