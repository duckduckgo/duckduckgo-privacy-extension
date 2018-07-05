const https = require('../../shared/js/background/https.es6.js')
const testDomains = require('./../data/httpsTestDomains.json')
const constants = require('../../shared/data/constants.js')
const httpsUpgradeListData = require('./../data/https-bloom.json')
const httpsWhitelistData = require('./../data/https-whitelist.json')

const setup = () => {
    let lists = constants.httpsLists
    lists.forEach(list => {
        if (list.name === 'httpsUpgradeList') {
            list.data = httpsUpgradeListData
        }
        else if (list.name === 'httpsWhitelist') {
            list.data = httpsWhitelistData
        }
    })

    https.setLists(lists)
}

describe('Https', () => {
    describe('https upgrading', () => {
        beforeEach(() => {
            setup()
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
