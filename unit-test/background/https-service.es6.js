const httpsService = require('../../shared/js/background/https-service.es6')

describe('Https upgrades', () => {
    let spy

    beforeAll(() => {
        spy = spyOn(httpsService, '_fetch')
    })

    beforeEach(() => {
        httpsService.clearCache()
    })

    describe('remote service communication', () => {
        beforeEach(() => {
            spy.calls.reset()
        })

        // TODO: Re-enable when example.com back online
        xit('should make a valid request to the SE service', () => {
            spy.and.returnValue(Promise.resolve({
                headers: {
                    get: () => {}
                },
                json: () => Promise.resolve([])
            }))

            httpsService.checkInService('example.com')

            expect(spy.calls.count()).toBe(1)
            expect(spy.calls.argsFor(0)[0]).toBe('https://duckduckgo.com/smarter_encryption.js?pv1=0caa')
        })

        it('should support punycode', () => {
            spy.and.returnValue(Promise.resolve({
                headers: {
                    get: () => {}
                },
                json: () => Promise.resolve([])
            }))

            httpsService.checkInService('☃.social')
            expect(spy.calls.argsFor(0)[0]).toBe('https://duckduckgo.com/smarter_encryption.js?pv1=1427')

            httpsService.checkInService('kraków.pl')
            expect(spy.calls.argsFor(1)[0]).toBe('https://duckduckgo.com/smarter_encryption.js?pv1=0fd1')

            httpsService.checkInService('フード.jp')
            expect(spy.calls.argsFor(2)[0]).toBe('https://duckduckgo.com/smarter_encryption.js?pv1=e21a')
        })

        it('should return a true/false result via promise 1/2', () => {
            spy.and.returnValue(Promise.resolve({
                headers: {
                    get: () => {}
                },
                json: () => Promise.resolve(['bad', '0caaf24ab1a0c33440c06afe99df986365b0781f', 'bad2'])
            }))

            const libraryResult = httpsService.checkInService('example.com')

            expect(libraryResult instanceof Promise).toBe(true)

            return libraryResult.then(libraryPromiseResult => {
                expect(libraryPromiseResult).toBe(true)
            })
        })

        it('should return a true/false result via promise 2/2', () => {
            spy.and.returnValue(Promise.resolve({
                headers: {
                    get: () => {}
                },
                json: () => Promise.resolve(['bad', 'bad2', 'bad3'])
            }))

            const libraryResult = httpsService.checkInService('example.com')

            expect(libraryResult instanceof Promise).toBe(true)

            return libraryResult.then(libraryPromiseResult => {
                expect(libraryPromiseResult).toBe(false)
            })
        })
    })

    describe('anti-flood prevention', () => {
        beforeEach(() => {
            spy.calls.reset()
        })

        it('should not make multiple requests with the same query at the same time', () => {
            spy.and.returnValue(Promise.resolve({
                headers: {
                    get: () => {}
                },
                json: () => Promise.resolve([])
            }))

            const promise1 = httpsService.checkInService('example.com')
            const promise2 = httpsService.checkInService('example.com')
            const promise3 = httpsService.checkInService('example.com')

            expect(spy.calls.count()).toBe(1)
            expect(promise1).toBe(promise2)
            expect(promise2).toBe(promise3)
        })

        it('should allow to make multiple requests with the same query one after another', () => {
            spy.and.returnValue(Promise.resolve({
                headers: {
                    get: () => {}
                },
                json: () => Promise.resolve([])
            }))

            const promise1 = httpsService.checkInService('example.com')

            return promise1.then(() => {
                const promise2 = httpsService.checkInService('example.com')

                expect(spy.calls.count()).toBe(2)
                expect(promise1).not.toBe(promise2)
            })
        })
    })

    describe('caching', () => {
        it('should cache responses', () => {
            spy.and.returnValue(Promise.resolve({
                headers: {
                    get: () => {}
                },
                json: () => Promise.resolve(['0caaf24ab1a0c33440c06afe99df986365b0781f'])
            }))

            const promise1 = httpsService.checkInService('example.com')

            return promise1.then(() => {
                expect(httpsService.checkInCache('example.com')).toBe(true)
            })
        })

        it('should allow to clear the cache', () => {
            spy.and.returnValue(Promise.resolve({
                headers: {
                    get: name => {
                        if (name === 'expires') {
                            return 'Tue, 1 Aug 2000 12:00:00 GMT'
                        }
                    }
                },
                json: () => Promise.resolve(['0caaf24ab1a0c33440c06afe99df986365b0781f'])
            }))

            const promise1 = httpsService.checkInService('example.com')

            return promise1.then(() => {
                httpsService.clearCache()
                expect(httpsService.checkInCache('example.com')).toBe(null)
            })
        })

        it('should allow to remove expired cache 1/2', () => {
            spy.and.returnValue(Promise.resolve({
                headers: {
                    get: name => {
                        if (name === 'expires') {
                            return 'Tue, 1 Aug 2000 12:00:00 GMT'
                        }
                    }
                },
                json: () => Promise.resolve(['0caaf24ab1a0c33440c06afe99df986365b0781f'])
            }))

            const promise1 = httpsService.checkInService('example.com')

            return promise1.then(() => {
                expect(httpsService.checkInCache('example.com')).toBe(true)
                httpsService.clearExpiredCache()
                expect(httpsService.checkInCache('example.com')).toBe(null)
            })
        })

        it('should allow to remove expired cache 2/2', () => {
            spy.and.returnValue(Promise.resolve({
                headers: {
                    get: name => {
                        if (name === 'expires') {
                            return 'Mon, 1 Aug 2050 12:00:00 GMT'
                        }
                    }
                },
                json: () => Promise.resolve(['0caaf24ab1a0c33440c06afe99df986365b0781f'])
            }))

            const promise1 = httpsService.checkInService('example.com')

            return promise1.then(() => {
                expect(httpsService.checkInCache('example.com')).toBe(true)
                httpsService.clearExpiredCache()
                expect(httpsService.checkInCache('example.com')).toBe(true)
            })
        })

        it('should cache for 1h if "expires" header contains invalid date', () => {
            spy.and.returnValue(Promise.resolve({
                headers: {
                    get: name => {
                        if (name === 'expires') {
                            return 'cats are not dates'
                        }
                    }
                },
                json: () => Promise.resolve(['0caaf24ab1a0c33440c06afe99df986365b0781f'])
            }))

            const promise1 = httpsService.checkInService('example.com')

            return promise1.then(() => {
                expect(httpsService.checkInCache('example.com')).toBe(true)
                httpsService.clearExpiredCache()
                expect(httpsService.checkInCache('example.com')).toBe(true)

                const newDate = Date.now() + 1000 * 60 * 61
                jasmine.clock().mockDate(new Date(newDate))
                httpsService.clearExpiredCache()
                expect(httpsService.checkInCache('example.com')).toBe(null)
                jasmine.clock().uninstall()
            })
        })
    })
})
