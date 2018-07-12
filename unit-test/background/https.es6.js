const testDomains = require('./../data/httpsTestDomains.json')
const https = require('../../shared/js/background/https.es6')
const httpsStorage = require('../../shared/js/background/storage/https.es6')
let originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL
jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000
let dataFromStorage = []

describe('Https ready', () => {
    beforeAll(() => {
        return new Promise((resolve) => {
            httpsStorage.getLists().then(lists => {
                dataFromStorage = lists
                https.setLists(dataFromStorage)
            })
            setTimeout(() => resolve(), 9000)
        })
    })

    it('httpsStorage gets list data', () => {
        let haveData = !!dataFromStorage.length
        expect(haveData).toEqual(true)
    })

    describe('https on', () => {
        beforeEach(() => {
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
        beforeEach(() => {
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
})
