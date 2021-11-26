require('../background/mock-browser-api')

const tds = require('../../shared/js/background/trackers.es6')
const tdsStorageStub = require('./../helpers/tds.es6')
const tdsStorage = require('../../shared/js/background/storage/tds.es6')

const trackerutils = require('../../shared/js/background/tracker-utils')
const browserWrapper = require('../../shared/js/background/wrapper.es6')

const configReference = require('./reference-tests/referrer-trimming/config_reference.json')
const blocklistReference = require('./reference-tests/referrer-trimming/tracker_radar_reference.json')
const testSets = require('./reference-tests/referrer-trimming/tests.json')

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

            if ('expectRefererHeaderValue' in test) {
                it(`${test.name}`, () => {
                    let truncatedReferrer = trackerutils.truncateReferrer(test.refererHeaderValue, test.targetURL)

                    // if truncateReferrer function returns undefined it means that the referrer should not be modified
                    if (truncatedReferrer === undefined) {
                        truncatedReferrer = test.refererHeaderValue
                    }

                    expect(truncatedReferrer).toEqual(test.expectRefererHeaderValue)
                })
            } else {
                throw new Error(`Unknown type of test - ${test.name}`)
            }
        })
    })
}
