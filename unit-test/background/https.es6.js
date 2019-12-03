const testDomains = require('./../data/httpsTestDomains.json')
const https = require('../../shared/js/background/https.es6')
const httpsStorage = require('../../shared/js/background/storage/https.es6')
const httpsBloom = require('./../data/httpsBloom.json')
const httpsWhitelist = require('./../data/httpsWhitelist.json')
const httpsNegativeBloom = require('./../data/httpsNegativeBloom.json')
const httpsNegativeWhitelist = require('./../data/httpsNegativeWhitelist.json')
const load = require('./../helpers/https.es6')
const httpsService = require('../../shared/js/background/https-service.es6')

describe('Https upgrades', () => {
    beforeAll(() => {
        load.loadStub({
            httpsBloom: httpsBloom,
            httpsWhitelist: httpsWhitelist,
            httpsNegativeBloom: httpsNegativeBloom,
            httpsNegativeWhitelist: httpsNegativeWhitelist
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

        it('should upgrade domains found in the positive bloom filter', () => {
            testDomains.shouldUpgrade.forEach(domain => {
                expect(https.canUpgradeUrl(domain)).toEqual(true)
            })
        })

        it('should not upgrade any local or private URLs', () => {
            testDomains.shouldNotUpgradePrivate.forEach(domain => {
                expect(https.canUpgradeUrl(domain)).toEqual(false)
            })
        })

        it('should not upgrade domains found in the negative bloom filter', () => {
            testDomains.shouldNotUpgrade.forEach(domain => {
                expect(https.canUpgradeUrl(domain)).toEqual(false)
            })
        })

        it('should not upgrade domains on the "don\'t upgrade" safelist', () => {
            https.dontUpgradeList.forEach(domain => {
                expect(https.canUpgradeUrl(domain)).toEqual(false)
            })
        })

        it('should upgrade domains on the "upgrade" safelist', () => {
            https.upgradeList.forEach(domain => {
                expect(https.canUpgradeUrl(domain)).toEqual(true)
            })
        })

        it('should request information from a service for domains missing from the bloom filters', () => {
            httpsService.clearCache()

            const spy = spyOn(httpsService, '_fetch').and.returnValue(Promise.resolve({
                headers: {
                    get: () => {}
                },
                json: () => Promise.resolve([])
            }))
            const requests = []

            testDomains.notInBloomFilters.forEach(domain => {
                const result = https.canUpgradeUrl(domain)
                expect(result instanceof Promise).toBe(true)
                requests.push(result)
            })

            // when all promises resolve, make sure that the cache is used next time
            return Promise.all(requests)
                .then(() => {
                    testDomains.notInBloomFilters.forEach(domain => {
                        expect(https.canUpgradeUrl(domain)).toEqual(false)
                    })

                    expect(spy.calls.count()).toEqual(testDomains.notInBloomFilters.length)
                    // disable the spy
                    spy.and.callThrough()
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
