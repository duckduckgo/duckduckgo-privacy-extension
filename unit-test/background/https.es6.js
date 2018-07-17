const testDomains = require('./../data/httpsTestDomains.json')
const https = require('../../shared/js/background/https.es6')
const httpsLists = require('./../data/httpsTestLists.json')
jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000

describe('Https storage', () => {
    beforeAll(() => {
        const httpsStorage = require('../../shared/js/background/storage/https.es6')
        return httpsStorage.getLists(Object.assign([], httpsLists))
        .then(lists => { 
           return https.setLists(lists)
        })
    })

    describe('https on', () => {
        beforeAll(() => {
            https.isReady = true
        })

        it('should be ready to upgrade', () => {
            expect(https.isReady).toEqual(true)
        })

        it('should upgrade known upgradable domains', () => {
            testDomains.shouldUpgrade.forEach(domain => {
                expect(https.canUpgradeHost(domain)).toEqual(true)
            })
        })

        it('should not upgrade whitelisted domains', () => {
            https.whitelist.forEach(domain => {
                expect(https.canUpgradeHost(domain)).toEqual(false)
            })
        })
    })

    describe('https off', () => {
        beforeAll(() => {
            https.isReady = false
        })

        it('should not be ready to upgrade', () => {
            expect(https.isReady).toEqual(false)
        })

        it('https off should not upgrade known upgradable domains', () => {
            testDomains.shouldUpgrade.forEach(domain => {
                expect(https.canUpgradeHost(domain)).toEqual(false)
            })
        })

        it('https off should not upgrade whitelisted domains', () => {
            https.whitelist.forEach(domain => {
                expect(https.canUpgradeHost(domain)).toEqual(false)
            })
        })
    })
    
    describe('Https storage errors', () => {
        const httpsStorage = require('../../shared/js/background/storage/https.es6')
        let goodDataChecksum = ''

        beforeAll(() => {
            return httpsStorage.getLists(Object.assign([], httpsLists)).then(lists => { 
                goodDataChecksum = lists[0].checksum.sha256
            })
        })
    
        it('should fallback to indexdDB data for a failed xhr', () => {
            let badListData = Object.assign([], httpsLists)
            badListData[0].url = 'http://ddg-staticcdn.s3.amazonaws.com/https/https-bloom-broken-test.json'

            return httpsStorage.getLists(badListData).then(lists => { 
                let haveData = !!lists.length
                expect(haveData).toEqual(true)

                // if the data we got back came from the db it should match the checksum from the first test
                expect(lists[0].checksum.sha256).toEqual(goodDataChecksum)
            })
            
            it('should fail if it tries to fallback and no db data exists', () => {
                // clear data in indexdb
                return httpsStorage.dbc.table('httpsStorage').delete('httpsUpgradeList').then(() => {
                    let badListData = Object.assign([], httpsLists)
                    badListData[0].url = 'http://ddg-staticcdn.s3.amazonaws.com/https/https-bloom-broken-test.json'
                    expect(false).toEqual(true)

                    return httpsStorage.getLists(badListData).then(lists => { 
                        // this should never resolve
                        expect(false).toEqual(true)
                    })
                })
            })
        })
    })
})
