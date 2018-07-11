const testDomains = require('./../data/httpsTestDomains.json')
const https = require('../../shared/js/background/https.es6.js')
const constants = require('../../shared/data/constants.js')
const httpsUpgradeListData = require('./../data/https-bloom.json')
const httpsWhitelistData = require('./../data/https-whitelist.json')

const buildLists = () => { 
    let lists = constants.httpsLists
    lists.forEach(list => {
        if (list.name === 'httpsUpgradeList') {
            list.data = JSON.parse(JSON.stringify(httpsUpgradeListData))
        } else if (list.name === 'httpsWhitelist') {
            list.data = httpsWhitelistData
        }
    })
    return lists
}

describe('Https good data update condition', () => {
    beforeAll(() => {
        return new Promise((resolve) => {
            let lists = buildLists()
            https.setLists(lists)
            setTimeout(() => resolve(), 2000)
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
        httpsWhitelistData.forEach(domain => {
            expect(https.canUpgradeHost(domain)).toEqual(false)
        })
    })
})

describe('Https update with bad data turns https off', () => {
    beforeAll(() => {
        return new Promise((resolve) => {
            // load some good data
            let lists = buildLists()
            https.setLists(lists)

            setTimeout(() => {
                // try to update with a bad checksum
                lists[0].data.checksum.sha256 = ''
                https.setLists(lists)
                setTimeout(() => resolve(), 2000)
            }, 2000)

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
        httpsWhitelistData.forEach(domain => {
            expect(https.canUpgradeHost(domain)).toEqual(false)
        })
    })
})
