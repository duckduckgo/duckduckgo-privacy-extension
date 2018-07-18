const httpsStorage = require('../../../shared/js/background/storage/https.es6')
const httpsBloom = require('./../../data/httpsBloom.json')
const httpsWhitelist = require('./../../data/httpsWhitelist.json')
const load = require('./../../helpers/https.es6.js')

describe('Https storage normal update', () => {
    beforeAll(() => {
        load.loadStub({httpsBloom: httpsBloom, httpsWhitelist: httpsWhitelist})
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
        let badBloom = JSON.parse(JSON.stringify(httpsBloom))
        badBloom.checksum.sha256 = 'badchecksum'
        load.loadStub({httpsBloom: badBloom, httpsWhitelist: httpsWhitelist})

        // stub for db storage
        spyOn(httpsStorage, 'storeInLocalDB').and.callFake((name, type, data) => {
            dbStub[name] = JSON.parse(JSON.stringify(data))
        })
        spyOn(httpsStorage, 'getDataFromLocalDB').and.callFake((name) => {
            let val = dbStub[name]
            if (val) {
                return Promise.resolve({data: val})
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
            httpsStorage.storeInLocalDB('httpsUpgradeList', 'upgrade list', httpsBloom)

            return httpsStorage.getLists().then(lists => {
                expect(!!lists.length).toEqual(true)
                // we should get the check sum from the good list back
                expect(lists[0].checksum.sha256).toEqual(httpsBloom.checksum.sha256)
            })
        })
    })
})
