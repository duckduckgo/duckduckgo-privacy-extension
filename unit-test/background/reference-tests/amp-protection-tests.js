import tds from '../../../shared/js/background/trackers'
import * as ampProtection from '../../../shared/js/background/amp-protection'
import tdsStorage from '../../../shared/js/background/storage/tds'
import Site from '../../../shared/js/background/classes/site'
const tdsStorageStub = require('../../helpers/tds.es6')
const config = require('../../data/reference-tests/amp-protections/config_reference.json')
const {
    ampFormats: { name: formatFeatureDescription, tests: ampFormatsTests }
} = require('../../data/reference-tests/amp-protections/tests.json')
const {
    ampKeywords: { name: keywordFeatureDescription, tests: ampKeywordTests }
} = require('../../data/reference-tests/amp-protections/tests.json')

describe(formatFeatureDescription + ': ', () => {
    beforeAll(() => {
        tdsStorageStub.stub({ config })

        return tdsStorage.getLists().then(lists => tds.setLists(lists))
    })

    for (const {
        name: testDescription, ampURL, expectURL, exceptPlatforms: skippedPlatforms = []
    } of ampFormatsTests) {
        if (skippedPlatforms.includes('web-extension')) {
            continue
        }

        it(testDescription, () => {
            const site = new Site('https://example.com')
            let canonUrl = ampProtection.extractAMPURL(site, ampURL)

            if (!canonUrl) {
                // tests expect unchanged urls to be empty strings
                canonUrl = ''
            }

            expect(canonUrl).toEqual(expectURL)
        })
    }
})

describe(keywordFeatureDescription + ': ', () => {
    beforeAll(() => {
        tdsStorageStub.stub({ config })

        return tdsStorage.getLists().then(lists => tds.setLists(lists))
    })

    for (const {
        name: testDescription, ampURL, expectAmpDetected, exceptPlatforms: skippedPlatforms = []
    } of ampKeywordTests) {
        if (skippedPlatforms.includes('web-extension')) {
            continue
        }

        it(testDescription, () => {
            const isAMPURL = ampProtection.isAMPURL(ampURL)
            expect(isAMPURL).toEqual(expectAmpDetected)
        })
    }
})
