const testDomains = require('./../data/httpsTestDomains.json')
const https = require('../../shared/js/background/https.es6')
const httpsStorage = require('../../shared/js/background/storage/https.es6')
const httpsBloom = require('./../data/httpsBloom.json')
const httpsWhitelist = require('./../data/httpsWhitelist.json')
const load = require('./../helpers/https.es6')
const newTab = require('./../data/newTab.json')

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
                let tab = JSON.parse(JSON.stringify(newTab))
                expect(https.canUpgradeHost(domain, tab)).toEqual(true)
                expect(tab.httpsUpgrades[domain]).toEqual(true)
            })
        })

        it('should not upgrade domains missing from the list', () => {
            testDomains.shouldNotUpgrade.forEach(domain => {
                let tab = JSON.parse(JSON.stringify(newTab))
                expect(https.canUpgradeHost(domain, tab)).toEqual(false)
                expect(tab.httpsUpgrades[domain]).toEqual(false)
            })
        })

        it('should not upgrade whitelisted domains', () => {
            https.whitelist.forEach(domain => {
                expect(https.canUpgradeHost(domain)).toEqual(false)
            })
        })

        it('should store all previous bloom filter results in tab object', () => {
            let tab = JSON.parse(JSON.stringify(newTab))
            const domainListLength = testDomains.shouldUpgrade.length + testDomains.shouldNotUpgrade.length
            testDomains.shouldUpgrade.forEach(domain => {
                https.canUpgradeHost(domain, tab)
            })
            testDomains.shouldNotUpgrade.forEach(domain => {
                https.canUpgradeHost(domain, tab)
            })
            expect(Object.keys(tab.httpsUpgrades).length).toEqual(domainListLength)
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
