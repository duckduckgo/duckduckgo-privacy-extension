const httpsStorage = require('../../../shared/js/background/storage/https.es6')
const httpsBloom = require('./../../data/httpsBloom.json')
const httpsWhitelist = require('./../../data/httpsWhitelist.json')
const load = require('./../../helpers/load.es6.js')
const constants = require('./../../../shared/data/constants.js')
const Storage = require('../../../shared/js/background/storage/storage.es6')

describe('Https storage normal update', () => {
    beforeAll(() => {
        load.loadStub({httpsBloom: httpsBloom, httpsWhitelist: httpsWhitelist})
    })

    it('should have list data', () => {
        return httpsStorage.getLists(constants.httpsLists).then(lists => {
            expect(!!lists.length).toEqual(true)
        })
    })
})

// Set a bad checksum in one of the https lists and try to call setLists
describe('Https storage bad xhr update', () => {

    describe('no db fallback data', () => {
        let dbStub = {}

        beforeAll(() => {
            spyOn(httpsStorage.storage, 'getDataFromLocalDB').and.callFake((name) => {
                let val = dbStub[name]
                if (val) {
                    return Promise.resolve({data: val})
                } else {
                    return Promise.resolve(false)
                }
            })
        })

        it('should fail if there is no db fallback', () => {
            return httpsStorage.getLists(constants.httpsLists).then(lists => {
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
            // set some good data in local db for us to fall back to
            httpsStorage.storage.storeInLocalDB('httpsUpgradeList', 'upgrade list', httpsBloom)
            // try to update with a bad checksum
            let badBloom = JSON.parse(JSON.stringify(httpsBloom))
            badBloom.checksum.sha256 = 'badchecksum'
            load.loadStub({httpsBloom: badBloom, httpsWhitelist: httpsWhitelist})
        })

        it('should have list data', () => {
            return httpsStorage.getLists(constants.httpsLists).then(lists => {
                expect(!!lists.length).toEqual(true)
                // we should get the check sum from the good list back
                expect(lists[0].checksum.sha256).toEqual(httpsBloom.checksum.sha256)
            })
        })
    })
})

