const testDomains = require('./../data/httpsTestDomains.json')
const https = require('../../shared/js/background/https.es6')
const httpsStorage = require('../../shared/js/background/storage/https.es6')
const httpsBloom = require('./../data/httpsBloom.json')
const httpsWhitelist = require('./../data/httpsWhitelist.json')
const load = require('../../shared/js/background/load.es6')

describe('Https upgrades', () => {
    beforeAll(() => {
        spyOn(load, 'loadExtensionFile').and.callFake((data) => {
            let response = {getResponseHeader: () => 'fakeEtagValue'}

            if (data.url.match('https-bloom.json')) {
                return Promise.resolve(Object.assign(response, {status: 200, data: httpsBloom}))
            } else if (data.url.match('https-whitelist.json')) {
                return Promise.resolve(Object.assign(response, {status: 200, data: httpsWhitelist}))
            } else {
                return Promise.reject(new Error('load error'))
            }
        })

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
