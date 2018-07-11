const testDomains = require('./../data/httpsTestDomains.json')
const constants = require('../../shared/data/constants.js')
const httpsUpgradeListData = require('./../data/https-bloom.json')
const httpsWhitelistData = require('./../data/https-whitelist.json')

const buildLists = () => { 
    let lists = constants.httpsLists
    lists.forEach(list => {
        if (list.name === 'httpsUpgradeList') {
            list.data = httpsUpgradeListData
        } else if (list.name === 'httpsWhitelist') {
            list.data = httpsWhitelistData
        }
    })
    return lists
}

describe('Https normal conditions', () => {
    const https = require('../../shared/js/background/https.es6.js')
    beforeAll(() => {
        return new Promise((resolve, reject) => {
            https.setLists(buildLists())
            setTimeout(() => resolve(), 2000)
        })
    })

    afterAll(() => https.isReady = false)

    describe('https upgrading', () => {
        it('should be ready to upgrade', () => {
            expect(https.isReady).toEqual(true)
        })
        
        it('should upgrade known upgradable domains', () => {
            testDomains.shouldUpgrade.forEach(domain => {
                expect(https.canUpgradeHost(domain)).toEqual(true)
            })
        })

        it('should not upgrade whitelisted domains', () => {
            httpsWhitelistData.forEach(domain => {
                expect(https.canUpgradeHost(domain)).toEqual(false)
            })
        })
    })
})

describe('Https error conditions', () => {
    const https2 = require('../../shared/js/background/https.es6.js')
    beforeAll(() => {
        return new Promise((resolve, reject) => {
            let lists = buildLists()
            lists[0].data.checksum.sha256 = ''
            https2.setLists(lists)
            setTimeout(() => resolve(), 2000)
        })
    })

    afterAll(() => https2.isReady = false)

    describe('https upgrading', () => {
        it('should be ready to upgrade', () => {
            expect(https2.isReady).toEqual(false)
        })
        
        it('should upgrade known upgradable domains', () => {
            testDomains.shouldUpgrade.forEach(domain => {
                expect(https2.canUpgradeHost(domain)).toEqual(false)
            })
        })

        it('should not upgrade whitelisted domains', () => {
            httpsWhitelistData.forEach(domain => {
                expect(https2.canUpgradeHost(domain)).toEqual(false)
            })
        })
    })
})

