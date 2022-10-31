import https from '../../../shared/js/background/https'
import tdsStorage from '../../../shared/js/background/storage/tds'
import httpsStorage from '../../../shared/js/background/storage/https'
import { Tab } from '../../../shared/js/background/classes/tab'
require('../../helpers/mock-browser-api')

const tdsStorageStub = require('../../helpers/tds.es6')

const browserWrapper = require('../../../shared/js/background/wrapper.es6')

const testSets = require('../../data/reference-tests/https-upgrades/tests.json')
const config = require('../../data/reference-tests/https-upgrades/config_reference.json')

const bloomFilter = require('../../data/reference-tests/https-upgrades/https_bloomfilter_reference.json')
const bloomFilterAllowlist = require('../../data/reference-tests/https-upgrades/https_allowlist_reference.json')
const negativeBloomFilter = require('../../data/reference-tests/https-upgrades/https_negative_bloomfilter_reference.json')
const negativeBloomFilterAllowlist = require('../../data/reference-tests/https-upgrades/https_negative_allowlist_reference.json')

const load = require('./../../helpers/https.es6')
const httpsService = require('../../../shared/js/background/https-service.es6')

const EXT_ID = 'ogigmfedpbpnnbcpgjloacccaibkaoip'

for (const setName of Object.keys(testSets)) {
    const testSet = testSets[setName]

    describe(`HTTPS upgrades tests / ${testSet.name} /`, () => {
        beforeAll(() => {
            spyOn(browserWrapper, 'getExtensionId').and.returnValue(EXT_ID)

            // disable https upgrade service
            spyOn(httpsService, 'checkInCache').and.returnValue(false)

            // load mock config
            tdsStorageStub.stub({ config })

            // load mock https upgrade data
            load.loadStub({
                httpsBloom: bloomFilter,
                httpsAllowlist: bloomFilterAllowlist,
                httpsNegativeBloom: negativeBloomFilter,
                httpsNegativeAllowlist: negativeBloomFilterAllowlist
            })

            // initialize https upgreade data and config
            return Promise.all([
                httpsStorage.getLists().then(lists => https.setLists(lists)),
                tdsStorage.getLists()
            ])
        })

        testSet.tests.forEach(test => {
            if (test.exceptPlatforms && test.exceptPlatforms.includes('web-extension')) {
                return
            }

            it(test.name, () => {
                const url = test.requestURL
                const tab = new Tab({
                    id: 1,
                    url: test.siteURL
                })
                const isMainFrame = (test.requestType === 'main_frame')
                const isPost = false

                expect(https.getUpgradedUrl(url, tab, isMainFrame, isPost)).toEqual(test.expectURL)
            })
        })
    })
}
