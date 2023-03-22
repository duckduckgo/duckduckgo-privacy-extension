require('../helpers/mock-browser-api')
const testDomains = require('./../data/httpsTestDomains.json')
const https = require('../../shared/js/background/https')
const httpsStorage = require('../../shared/js/background/storage/https').default
const httpsBloom = require('./../data/httpsBloom.json')
const httpsAllowlist = require('./../data/httpsAllowlist.json')
const httpsNegativeBloom = require('./../data/httpsNegativeBloom.json')
const httpsNegativeAllowlist = require('./../data/httpsNegativeAllowlist.json')
const load = require('./../helpers/https')
const httpsService = require('../../shared/js/background/https-service')

describe('Https upgrades', () => {
    beforeAll(() => {
        load.loadStub({
            httpsBloom,
            httpsAllowlist,
            httpsNegativeBloom,
            httpsNegativeAllowlist
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
