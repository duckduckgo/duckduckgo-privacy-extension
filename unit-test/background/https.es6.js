const testDomains = require('./../data/httpsTestDomains.json')
const https = require('../../shared/js/background/https.es6')
const httpsStorage = require('../../shared/js/background/storage/https.es6')
const httpsBloom = require('./../data/httpsBloom.json')
const httpsWhitelist = require('./../data/httpsWhitelist.json')
const load = require('./../helpers/https.es6')

describe('Https upgrades', () => {
    beforeAll(() => {
        load.loadStub({httpsBloom: httpsBloom, httpsWhitelist: httpsWhitelist})

        return httpsStorage.getLists()
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

        it('should not upgrade domains missing from the list', () => {
            testDomains.shouldNotUpgrade.forEach(domain => {
                expect(https.canUpgradeHost(domain)).toEqual(false)
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
            return https.setLists({})
        })

        it('failed update should turn https off', () => {
            expect(https.isReady).toEqual(false)
        })
    })
})
