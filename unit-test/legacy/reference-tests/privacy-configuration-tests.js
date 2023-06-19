require('../../helpers/mock-browser-api')

const tdsStorageStub = require('../../helpers/tds')
const tdsStorage = require('../../../shared/js/background/storage/tds').default

const Site = require('../../../shared/js/background/classes/site').default
const utils = require('../../../shared/js/background/utils')

const contentScriptUtils = require('@duckduckgo/content-scope-scripts/src/utils.js')

const testSets = require('@duckduckgo/privacy-reference-tests/privacy-configuration/tests.json')
const configs = {
    // FILE_MAP ../../../node_modules/@duckduckgo/privacy-reference-tests/privacy-configuration/config*_reference.json
}

for (const setName of Object.keys(testSets)) {
    const testSet = testSets[setName]

    describe(`Remote config tests / ${testSet.name} /`, () => {
        beforeAll(() => {
            const config = configs[testSet.referenceConfig]

            tdsStorageStub.stub({ config })

            return tdsStorage.getLists()
        })

        testSet.tests.forEach(test => {
            if (test.exceptPlatforms && test.exceptPlatforms.includes('web-extension')) {
                return
            }

            if (test.frameURL === 'about:blank') {
                it(`${test.name}`, () => {
                    const enabledFeatures = utils.getEnabledFeaturesAboutBlank(test.siteURL)
                    const isEnabled = enabledFeatures.includes(test.featureName)

                    expect(isEnabled).toEqual(test.expectFeatureEnabled)
                })
            } else if (test.scriptURL) {
                it(`${test.name}`, () => {
                    contentScriptUtils.initStringExemptionLists({
                        stringExemptionLists: utils.getBrokenScriptLists()
                    })
                    const isEnabled = !contentScriptUtils.shouldExemptUrl(test.featureName, test.scriptURL)

                    expect(isEnabled).toEqual(test.expectFeatureEnabled)
                })
            } else {
                it(`${test.name}`, () => {
                    const site = new Site(test.siteURL)
                    const isEnabled = site.isFeatureEnabled(test.featureName)

                    expect(isEnabled).toEqual(test.expectFeatureEnabled)
                })
            }
        })
    })
}
