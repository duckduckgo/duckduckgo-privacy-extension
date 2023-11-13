const tdsStorageStub = require('../../helpers/tds')
const tdsStorage = require('../../../shared/js/background/storage/tds').default

const Site = require('../../../shared/js/background/classes/site').default
const GPC = require('../../../shared/js/background/GPC')
const GpcContentScript = require('@duckduckgo/content-scope-scripts/src/features/gpc').default
const gpcContentScript = new GpcContentScript('gpc')
const constants = require('../../../shared/data/constants')
const settings = require('../../../shared/js/background/settings')

const contentScriptUtils = require('@duckduckgo/content-scope-scripts/src/utils.js')

const testSets = require('@duckduckgo/privacy-reference-tests/global-privacy-control/tests.json')
const config = require('@duckduckgo/privacy-reference-tests/global-privacy-control/config_reference.json')

for (const setName of Object.keys(testSets)) {
    const testSet = testSets[setName]

    describe(`GPC tests / ${testSet.name} /`, () => {
        beforeAll(() => {
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

                    if ('expectGPCHeaderValue' in test) {
                        expect(GPCHeader.value).toEqual(test.expectGPCHeaderValue)
                    }
                })
            } else if ('expectGPCAPI' in test) {
                it(`${test.name}`, () => {
                    const args = {
                        site: new Site(test.siteURL),
                        globalPrivacyControlValue: test.gpcUserSettingOn,
                        platform: constants.platform
                    }
                    const isEnabled = !contentScriptUtils.isFeatureBroken(args, 'gpc')

                    expect(isEnabled).toEqual(test.expectGPCAPI)

                    if ('expectGPCAPIValue' in test) {
                        const FakeNavigator = function () {}
                        const fakeNavigator = new FakeNavigator()
                        const orgNavigator = globalThis.Navigator

                        // replacing real navigator and Navigator with fake ones
                        globalThis.Navigator = FakeNavigator
                        spyOnProperty(globalThis, 'navigator', 'get').and.returnValue(fakeNavigator)

                        if (isEnabled) {
                            gpcContentScript.callInit(args)
                        }

                        // clean up
                        globalThis.Navigator = orgNavigator

                        expect(String(FakeNavigator.prototype.globalPrivacyControl)).toBe(test.expectGPCAPIValue)
                    }
                })
            } else {
                throw new Error('Unknown type of test - ' + test.name)
            }
        })
    })
}
