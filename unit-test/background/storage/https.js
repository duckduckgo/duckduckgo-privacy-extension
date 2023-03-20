require('../../helpers/mock-browser-api')
const httpsStorage = require('../../../shared/js/background/storage/https').default
const httpsBloom = require('./../../data/httpsBloom.json')
const httpsAllowlist = require('./../../data/httpsAllowlist.json')
const httpsNegativeBloom = require('./../../data/httpsNegativeBloom.json')
const httpsNegativeAllowlist = require('./../../data/httpsNegativeAllowlist.json')
const load = require('./../../helpers/https.js')

describe('Https storage normal update', () => {
    beforeAll(() => {
        load.loadStub({
            httpsBloom,
            httpsAllowlist,
            httpsNegativeBloom,
            httpsNegativeAllowlist
        })
    })

    it('should have list data', () => {
        return httpsStorage.getLists().then(lists => {
            expect(!!lists.length).toEqual(true)
        })
    })
})

// Set a bad checksum in one of the https lists and try to call setLists
describe('Https storage bad xhr update', () => {
    let dbStub = {}

    beforeEach(() => {
        const badBloom = JSON.parse(JSON.stringify(httpsBloom))
        badBloom.checksum.sha256 = 'badchecksum'
        load.loadStub({
            httpsBloom: badBloom,
            httpsAllowlist,
            httpsNegativeBloom,
            httpsNegativeAllowlist
        })

        // stub for db storage
        spyOn(httpsStorage, 'storeInLocalDB').and.callFake((name, type, data) => {
            dbStub[name] = JSON.parse(JSON.stringify(data))
        })
        spyOn(httpsStorage, 'getListFromLocalDB').and.callFake(listDetails => {
            const val = dbStub[listDetails.name]
            if (val) {
                return Promise.resolve(Object.assign(listDetails, val))
            } else {
                return Promise.resolve(false)
            }
        })
    })

    describe('no db fallback data', () => {
        beforeAll(() => {
            dbStub = {}
        })

        it('should fail if there is no db fallback', () => {
            return httpsStorage.getLists().then(lists => {
                // this should never resolve
                expect(true).toEqual(false)
            }).catch(e => {
                // a failed update should always thow an error
                expect(true).toEqual(true)
            })
        })
    })

    describe('has fallback db data', () => {
        beforeAll(() => {
            dbStub = {}
        })

        it('should have list data', () => {
            // set some good data in local db
            httpsStorage.storeInLocalDB('httpsUpgradeBloomFilter', 'upgrade list', httpsBloom)

            return httpsStorage.getLists().then(lists => {
                expect(!!lists.length).toEqual(true)
                // we should get the check sum from the good list back
                expect(lists[0].checksum.sha256).toEqual(httpsBloom.checksum.sha256)
            })
        })
    })
})
