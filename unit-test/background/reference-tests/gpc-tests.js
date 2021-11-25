require('../../helpers/mock-browser-api')

const tdsStorageStub = require('../../helpers/tds.es6')
const tdsStorage = require('../../../shared/js/background/storage/tds.es6')

const Site = require('../../../shared/js/background/classes/site.es6')
const GPC = require('../../../shared/js/background/GPC.es6')
const gpcContentScript = require('../../../shared/js/content-scope/gpc-protection')
const browserWrapper = require('../../../shared/js/background/wrapper.es6')
const settings = require('../../../shared/js/background/settings.es6')

const contentScriptUtils = require('../../../shared/js/content-scope/utils.js')

const testSets = require('../../data/reference-tests/global-privacy-control/tests.json')
const config = require('../../data/reference-tests/global-privacy-control/config_reference.json')

const EXT_ID = 'ogigmfedpbpnnbcpgjloacccaibkaoip'

for (const setName of Object.keys(testSets)) {
    const testSet = testSets[setName]

    describe(`GPC tests / ${testSet.name} /`, () => {
        beforeAll(() => {
            spyOn(browserWrapper, 'getExtensionId').and.returnValue(EXT_ID)
            tdsStorageStub.stub({ config })

            return tdsStorage.getLists()
        })

        testSet.tests.forEach(test => {
            if (test.exceptPlatforms && test.exceptPlatforms.includes('web-extension')) {
                return
            }

            // header test
            if ('expectGPCHeader' in test) {
                it(`${test.name}`, () => {
                    spyOn(settings, 'getSetting').and.returnValue(test.gpcUserSettingOn)

                    const site = new Site(test.siteURL)
                    const isEnabled = site.isFeatureEnabled('gpc')
                    const GPCHeader = GPC.getHeader()

                    expect(Boolean(GPCHeader && isEnabled)).toEqual(test.expectGPCHeader)

                    if ('expectHeaderName' in test) {
                        expect(GPCHeader.name).toEqual(test.expectHeaderName)
                    }

                    if ('expectHeaderValue' in test) {
                        expect(GPCHeader.value).toEqual(test.expectHeaderValue)
                    }
                })
            } else if ('expectGPCAPI' in test) {
                it(`${test.name}`, () => {
                    const args = {
                        site: new Site(test.siteURL),
                        globalPrivacyControlValue: test.gpcUserSettingOn
                    }
                    const isEnabled = !contentScriptUtils.isFeatureBroken(args, 'gpc')

                    expect(isEnabled).toEqual(test.expectGPCAPI)

                    if ('expectJavaScriptToBeTrue' in test) {
                        const FakeNavigator = function () {}
                        const fakeNavigator = new FakeNavigator()
                        const orgNavigator = globalThis.Navigator

                        // replacing real navigator and Navigator with fake ones
                        globalThis.Navigator = FakeNavigator
                        spyOnProperty(globalThis, 'navigator', 'get').and.returnValue(fakeNavigator)

                        gpcContentScript.init.call(globalThis, args)

                        // eslint-disable-next-line no-new-func
                        const evalResult = Function('Navigator', 'navigator', `"use strict"; return ${test.expectJavaScriptToBeTrue}`)(FakeNavigator, fakeNavigator)

                        // clean up
                        globalThis.Navigator = orgNavigator

                        expect(evalResult).toBeTrue()
                    }
                })
            } else {
                throw new Error('Unknown type of test - ' + test.name)
            }
        })
    })
}
