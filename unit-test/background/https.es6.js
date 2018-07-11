const testDomains = require('./../data/httpsTestDomains.json')
const https = require('../../shared/js/background/https.es6')
const httpsStorage = require('../../shared/js/background/storage/https.es6')

describe('Https ready', () => {
    beforeAll(() => {
        return new Promise((resolve) => {
            httpsStorage.getLists().then(lists => {
                https.setLists(lists)
            })
            setTimeout(() => resolve(), 4000)
        })
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

describe('Https not ready', () => {
    beforeAll(() => {
        return new Promise((resolve) => {
            httpsStorage.getLists().then(lists => {
                https.setLists(lists)
            })
            setTimeout(() => {
                https.isReady = false
                resolve()
            }, 4000)
        })
    })

    it('should not be ready to upgrade', () => {
        expect(https.isReady).toEqual(false)
    })

    it('should not upgrade known upgradable domains', () => {
        testDomains.shouldUpgrade.forEach(domain => {
            expect(https.canUpgradeHost(domain)).toEqual(false)
        })
    })

    it('should not upgrade whitelisted domains', () => {
        https.whitelist.forEach(domain => {
            expect(https.canUpgradeHost(domain)).toEqual(false)
        })
    })
})
