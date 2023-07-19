import 'fake-indexeddb/auto'

const settings = require('../../../shared/js/background/settings')
const tdsStorageStub = require('../../helpers/tds')
const tdsStorage = require('../../../shared/js/background/storage/tds').default

const testSets = require('@duckduckgo/privacy-reference-tests/https-upgrades/tests.json')
const config = require('@duckduckgo/privacy-reference-tests/https-upgrades/config_reference.json')

const bloomFilter = require('@duckduckgo/privacy-reference-tests/https-upgrades/https_bloomfilter_reference.json')
const bloomFilterAllowlist = require('@duckduckgo/privacy-reference-tests/https-upgrades/https_allowlist_reference.json')
const negativeBloomFilter = require('@duckduckgo/privacy-reference-tests/https-upgrades/https_negative_bloomfilter_reference.json')
const negativeBloomFilterAllowlist = require('@duckduckgo/privacy-reference-tests/https-upgrades/https_negative_allowlist_reference.json')

const https = require('../../../shared/js/background/https')
const httpsStorage = require('../../../shared/js/background/storage/https').default
const load = require('./../../helpers/https')
const Tab = require('../../../shared/js/background/classes/tab')
const httpsService = require('../../../shared/js/background/https-service')

for (const setName of Object.keys(testSets)) {
    const testSet = testSets[setName]

    describe(`HTTPS upgrades tests / ${testSet.name} /`, () => {
        beforeAll(() => {
            // disable https upgrade service
            spyOn(httpsService, 'checkInCache').and.returnValue(false)
            const settingsSpy = spyOn(settings, 'getSetting')
            settingsSpy.withArgs('httpsEverywhereEnabled').and.returnValue(true)
            settingsSpy.and.returnValue(undefined)

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
