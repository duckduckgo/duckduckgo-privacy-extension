const trackerutils = require('../../shared/js/background/tracker-utils')
const tds = require('../../shared/js/background/trackers.es6')
const tdsStorage = require('../../shared/js/background/storage/tds.es6')
const tdsStorageStub = require('./../helpers/tds.es6')
const settings = require('../../shared/js/background/settings.es6')

describe('Tracker Utilities', () => {
    let settingsObserver
    let timer = Date.now()
    const jump = 1000 * 60 * 31 // slightly more than cache timeout

    beforeAll(() => {
        settingsObserver = spyOn(settings, 'getSetting')
        tdsStorageStub.stub()

        // Make sure we don't use any list caches for these tests
        spyOn(Date, 'now').and.callFake(function () {
            // Cache may be updated on each run, so keep jumping the time forward for each call
            timer += jump
            return timer
        })

        return tdsStorage.getLists()
            .then(lists => {
                return tds.setLists(lists)
            })
    })

    const knownTrackers = [
        'http://google-analytics.com',
        'https://google-analytics.com',
        'https://google-analytics.com/site/abc',
        'https://google-analytics.com/a/b?p=g&1=2',
        'https://google-analytics.com:443/abc',
        'https://yahoo.com'
    ]
    it('Should identify a tracker correctly', () => {
        for (const tracker of knownTrackers) {
            settingsObserver.and.returnValue(undefined)
            expect(trackerutils.isTracker(tracker)).toBeTruthy()
        }
    })

    const notTrackers = [
        'http://not-google-analytics.com',
        'http://www.justarandompersonalsite.com'
    ]
    it('Should identify a non-tracker correctly', () => {
        for (const tracker of notTrackers) {
            settingsObserver.and.returnValue(true)
            expect(trackerutils.isTracker(tracker)).toBeFalsy()
        }
    })

    const entityTests = [
        {
            entity1: 'google.com',
            entity2: 'analytics.google.com',
            sameEntity: true
        },
        {
            entity1: 'google.com',
            entity2: 'analytics.google.com.ru',
            sameEntity: false
        },
        {
            entity1: 'admeld.com',
            entity2: 'adgoogle.net',
            sameEntity: true
        },
        {
            entity1: 'yahoo.com',
            entity2: 'yahoo.com',
            sameEntity: true
        },
        {
            entity1: 'yahoo.com',
            entity2: 'google.com',
            sameEntity: false
        }
    ]
    it('Should correctly match entities', () => {
        for (const test of entityTests) {
            settingsObserver.and.returnValue(undefined)
            expect(trackerutils.isSameEntity(test.entity1, test.entity2)).toEqual(test.sameEntity)
        }
    })

    const referrerSameEntityTests = [
        {
            referrer: '',
            target: '',
            expectedReferrer: undefined
        },
        {
            referrer: 'yahoo.com',
            target: 'yahoo.com',
            expectedReferrer: undefined
        },
        {
            referrer: 'admeld.com',
            target: 'adgoogle.net',
            expectedReferrer: undefined
        },
        {
            referrer: 'google.com',
            target: 'analytics.google.com',
            expectedReferrer: undefined
        }
    ]
    it('Should not modify referrer on blank referrers and first party', () => {
        for (const test of referrerSameEntityTests) {
            settingsObserver.and.returnValue(undefined)
            expect(trackerutils.truncateReferrer(test.referrer, test.target)).toEqual(test.expectedReferrer)
        }
    })

    const referrerUserSafelistTests = [
        {
            name: 'referrer is safelisted',
            referrer: 'http://siteA.com',
            target: 'http://siteB.com',
            safelist: { 'sitea.com': true },
            expectedReferrer: undefined
        },
        {
            name: 'target is safelisted',
            referrer: 'http://siteA.com',
            target: 'http://siteB.com',
            safelist: { 'siteb.com': true },
            expectedReferrer: undefined
        },
        {
            name: 'referrer & target are safelisted',
            referrer: 'http://siteA.com',
            target: 'http://siteB.com',
            safelist: { 'sitea.com': true, 'siteb.com': true },
            expectedReferrer: undefined
        },
        {
            name: 'subdomain of safelisted target',
            referrer: 'http://siteA.com',
            target: 'http://subdomain.siteB.com',
            safelist: { 'siteb.com': true },
            expectedReferrer: undefined
        }
    ]
    it('Should not modify referrer when either site is safe listed by the user', () => {
        for (const test of referrerUserSafelistTests) {
            settingsObserver.and.returnValue(test.safelist)
            expect(trackerutils.truncateReferrer(test.referrer, test.target)).withContext(`safelist: ${test.name}`).toEqual(test.expectedReferrer)
        }
    })

    const referrerSafelistTests = [
        {
            name: 'referrer is safelisted',
            referrer: 'http://test.com',
            target: 'http://siteA.com',
            expectedReferrer: undefined
        },
        {
            name: 'target is safelisted',
            referrer: 'http://siteA.com',
            target: 'http://test.com',
            expectedReferrer: undefined
        },
        {
            name: 'safe listed entry has a path',
            referrer: 'http://testing.com/some/path/here',
            target: 'http://sitea.com',
            expectedReferrer: undefined
        },
        {
            name: 'subdomain of safelisted target',
            referrer: 'http://siteA.com',
            target: 'http://subdomain.testing.com/some/path?option=yes&option2=no',
            expectedReferrer: undefined
        }
    ]
    it('Should not modify referrer when either site is safe listed by the global referrer safe list', () => {
        for (const test of referrerSafelistTests) {
            settingsObserver.and.returnValue(undefined)
            expect(trackerutils.truncateReferrer(test.referrer, test.target)).withContext(`test: ${test.name}`).toEqual(test.expectedReferrer)
        }
    })

    const referrerTruncationTests = [
        {
            name: 'Simple truncation test',
            referrer: 'http://siteA.com/article/1',
            target: 'http://siteB.com',
            expectedReferrer: 'http://sitea.com/'
        },
        {
            name: 'target is a tracker, and referrer has a subdomain',
            referrer: 'http://subdomain.siteA.com/article/1',
            target: 'https://google-analytics.com/some/path',
            expectedReferrer: 'http://sitea.com/'
        },
        {
            name: 'target is not a tracker, referrer should keep subdomain',
            referrer: 'http://subdomain.siteA.com/article/1',
            target: 'http://siteB.com',
            expectedReferrer: 'http://subdomain.sitea.com/'
        },
        {
            name: 'target is not a tracker, referrer should keep multi-level subdomain',
            referrer: 'http://a.b.subdomain.siteA.com/article/1',
            target: 'http://siteB.com',
            expectedReferrer: 'http://a.b.subdomain.sitea.com/'
        },
        {
            name: 'target is a tracker, and referrer has a subdomain that is www only.',
            referrer: 'http://www.siteA.com/article/1',
            target: 'https://google-analytics.com/some/path',
            expectedReferrer: 'http://www.sitea.com/'
        },
        {
            name: 'target is not a tracker, and referrer has a subdomain that is www only.',
            referrer: 'http://www.siteA.com/article/1',
            target: 'http://siteB.com',
            expectedReferrer: 'http://www.sitea.com/'
        },
        {
            name: 'target is not a tracker, referrer contains port',
            referrer: 'http://www.siteA.com:4000/article/1',
            target: 'http://siteB.com',
            expectedReferrer: 'http://www.sitea.com:4000/'
        },
        {
            name: 'target is not a tracker, referrer is localhost',
            referrer: 'http://localhost/article/1',
            target: 'http://siteB.com',
            expectedReferrer: 'http://localhost/'
        },
        {
            name: 'target is not a tracker, referrer is IP',
            referrer: 'http://1.2.3.4/article/1',
            target: 'http://siteB.com',
            expectedReferrer: 'http://1.2.3.4/'
        },
        {
            name: 'target is a tracker, referrer contains port',
            referrer: 'http://subdomain.siteA.com:4000/article/1',
            target: 'https://google-analytics.com/some/path',
            expectedReferrer: 'http://sitea.com:4000/'
        },
        {
            name: 'target is a tracker, referrer is localhost',
            referrer: 'http://localhost/article/1',
            target: 'https://google-analytics.com/some/path',
            expectedReferrer: 'http://localhost/'
        },
        {
            name: 'target is a tracker, referrer is IP',
            referrer: 'http://1.2.3.4/article/1',
            target: 'https://google-analytics.com/some/path',
            expectedReferrer: 'http://1.2.3.4/'
        }
    ]
    it('Should modify referrer when referrer != target', () => {
        for (const test of referrerTruncationTests) {
            settingsObserver.and.returnValue(undefined)
            expect(trackerutils.truncateReferrer(test.referrer, test.target)).withContext(`test: ${test.name}`).toEqual(test.expectedReferrer)
        }
    })

    const referrerOddURLTests = [
        {
            name: 'localhost',
            referrer: 'http://localhost/article/1',
            target: 'http://siteB.com'
        },
        {
            name: 'settings page',
            referrer: 'chrome://inspect/#pages',
            target: 'http://siteB.com'
        },
        {
            name: 'firefox about page',
            referrer: 'about:debugging#/runtime/this-firefox',
            target: 'http://siteB.com'
        },
        {
            name: 'devtools about page',
            referrer: 'devtools://devtools/bundled/devtools_app.html',
            target: 'http://siteB.com'
        },
        {
            name: 'Chrome Extension page',
            referrer: 'chrome-extension://cjpalhdlnbpafiamejdnhcphjbkeiagm/dashboard.html#settings.html',
            target: 'http://siteB.com'
        },
        {
            name: 'Moz Extension page',
            referrer: 'moz-extension://31261636-83bc-0f4a-b9fc-b2edc39ea32c/dashboard.html#settings.html',
            target: 'http://siteB.com'
        },
        {
            name: 'localhost',
            referrer: 'http://siteB.com',
            target: 'http://localhost:3000.com'
        },
        {
            name: 'settings page',
            referrer: 'http://siteB.com',
            target: 'chrome://inspect2/#pages'
        },
        {
            name: 'firefox about page',
            referrer: 'http://siteB.com',
            target: 'about:debugging2#/runtime/this-firefox'
        },
        {
            name: 'devtools about page',
            referrer: 'http://siteB.com',
            target: 'devtools://devtools2/bundled/devtools_app.html'
        },
        {
            name: 'Chrome Extension page',
            referrer: 'http://siteB.com',
            target: 'chrome-extension://cjpalhdlnbpafiamejdnhcphjbkeiagmsd/dashboard.html#settings.html'
        },
        {
            name: 'Moz Extension page',
            referrer: 'http://siteB.com',
            target: 'moz-extension://31261636-83bc-0f4a-b9fc-b2edc39ea32cdf/dashboard.html#settings.html'
        }
    ]
    it('Should not throw errors when unusual URLs are encountered', () => {
        for (const test of referrerOddURLTests) {
            expect(function () {
                settingsObserver.and.returnValue(undefined)
                trackerutils.truncateReferrer(test.referrer, test.target)
            }).withContext(`test: ${test.name}`).not.toThrow()
        }
    })

    const socialTrackerTests = [
        {
            name: 'Facebook.net',
            url: 'Facebook.net',
            expectedResult: {
                entity: 'Facebook',
                redirectUrl: undefined
            }
        },
        {
            name: 'Facebook.com',
            url: 'https://facebook.com',
            expectedResult: {
                entity: 'Facebook',
                redirectUrl: undefined
            }
        },
        {
            name: 'Facebook.com with params',
            url: 'https://developers.facebook.com/docs/plugins',
            expectedResult: {
                entity: 'Facebook',
                redirectUrl: undefined
            }
        }
    ]
    it('Should correctly handle social trackers', () => {
        settings.ready().then(() => {
            settings.updateSetting('activeExperiment', true)
            settings.updateSetting('experimentData', { blockFacebook: true })
            spyOn(trackerutils, 'facebookExperimentIsActive').and.returnValue(true)
            for (const test of socialTrackerTests) {
                const result = trackerutils.getSocialTracker(test.url)
                expect(result.entity).withContext(`test (entity): ${test.name}`).toEqual(test.expectedResult.entity)
                expect(result.redirectUrl).withContext(`test (redirect): ${test.name}`).toEqual(test.expectedResult.redirectUrl)
            }
        })
    })

    const socialTrackerSurrogateTests = [
        {
            name: 'Facebook US SDK',
            url: 'https://connect.facebook.net/en_US/sdk.js',
            expectedResult: {
                entity: 'Facebook'
            }
        },
        {
            name: 'Facebook GB SDK',
            url: 'https://connect.facebook.net/en_GB/sdk.js',
            expectedResult: {
                entity: 'Facebook'
            }
        }
    ]
    it('Should return a surrogate redirect', () => {
        settings.ready().then(() => {
            settings.updateSetting('activeExperiment', true)
            settings.updateSetting('experimentData', { blockFacebook: true })
            for (const test of socialTrackerSurrogateTests) {
                const result = trackerutils.getSocialTracker(test.url)
                expect(result.entity).withContext(`test (entity): ${test.name}`).toEqual(test.expectedResult.entity)
                expect(result.redirectUrl).withContext(`test (redirect): ${test.name}`).not.toEqual(undefined)
            }
        })
    })

    const unsocialTrackerTests = [
        {
            name: 'Blank url',
            url: '',
            expectedResult: undefined
        },
        {
            name: 'Google Analytics',
            url: 'https://analytics.google.com',
            expectedResult: undefined
        }
    ]
    it('Should not label non-social trackers as social trackers', () => {
        for (const test of unsocialTrackerTests) {
            expect(trackerutils.getSocialTracker(test.url)).withContext(`test: ${test.name}`).toEqual(test.expectedResult)
        }
    })

    const socialExcludeTests = [
        {
            name: 'Empty exlude list',
            url: 'https://sitea.com',
            network: 'Social1',
            ClickToLoadConfig: {
                Social1: {
                    excludedDomains: []
                }
            },
            expectedResult: true
        },
        {
            name: 'Different domain excluded',
            url: 'https://sitea.com',
            network: 'Social1',
            ClickToLoadConfig: {
                Social1: {
                    excludedDomains: [
                        {
                            domain: 'NotSiteA.com',
                            reason: 'some reason'
                        }
                    ]
                }
            },
            expectedResult: true
        },
        {
            name: 'Domain excluded',
            url: 'https://sitea.com',
            network: 'Social1',
            ClickToLoadConfig: {
                Social1: {
                    excludedDomains: [
                        {
                            domain: 'sitea.com',
                            reason: 'some reason'
                        }
                    ]
                }
            },
            expectedResult: false
        },
        {
            name: 'Domain excluded with other sites',
            url: 'https://sitea.com',
            network: 'Social1',
            ClickToLoadConfig: {
                Social1: {
                    excludedDomains: [
                        {
                            domain: 'sitea.com',
                            reason: 'some reason'
                        },
                        {
                            domain: 'siteb.com',
                            reason: 'some reason'
                        }
                    ]
                }
            },
            expectedResult: false
        },
        {
            name: 'Domain not excluded, but others are',
            url: 'https://sitea.com',
            network: 'Social1',
            ClickToLoadConfig: {
                Social1: {
                    excludedDomains: [
                        {
                            domain: 'sitec.com',
                            reason: 'some reason'
                        },
                        {
                            domain: 'siteb.com',
                            reason: 'some reason'
                        }
                    ]
                }
            },
            expectedResult: true
        }
    ]
    it('Should handle social exclude list correctly (block or not)', () => {
        const originalConfig = tdsStorage.ClickToLoadConfig
        for (const test of socialExcludeTests) {
            tdsStorage.ClickToLoadConfig = test.ClickToLoadConfig
            expect(trackerutils.shouldBlockSocialNetwork(test.network, test.url)).withContext(`test: ${test.name}`).toEqual(test.expectedResult)
        }
        tdsStorage.ClickToLoadConfig = originalConfig
    })

    const socialDomainExcludeTests = [
        {
            name: 'Empty exlude list',
            url: 'https://sitea.com',
            network: 'Social1',
            ClickToLoadConfig: {
                Social1: {
                    excludedDomains: []
                }
            },
            expectedResult: []
        },
        {
            name: 'single Entity, single Entry',
            network: 'Social1',
            ClickToLoadConfig: {
                Social1: {
                    excludedDomains: [
                        {
                            domain: 'sitea.com',
                            reason: 'some reason'
                        }
                    ]
                }
            },
            expectedResult: [
                {
                    entity: 'Social1',
                    domain: 'sitea.com'
                }
            ]
        },
        {
            name: 'single Entity, double Entry',
            network: 'Social1',
            ClickToLoadConfig: {
                Social1: {
                    excludedDomains: [
                        {
                            domain: 'sitea.com',
                            reason: 'some reason'
                        },
                        {
                            domain: 'siteb.com',
                            reason: 'some reason'
                        }
                    ]
                }
            },
            expectedResult: [
                {
                    entity: 'Social1',
                    domain: 'sitea.com'
                },
                {
                    entity: 'Social1',
                    domain: 'siteb.com'
                }
            ]
        },
        {
            name: 'Two Entities',
            network: 'Social1',
            ClickToLoadConfig: {
                Social1: {
                    excludedDomains: [
                        {
                            domain: 'sitea.com',
                            reason: 'some reason'
                        },
                        {
                            domain: 'siteb.com',
                            reason: 'some reason'
                        }
                    ]
                },
                Social2: {
                    excludedDomains: [
                        {
                            domain: 'sitea.com',
                            reason: 'some reason'
                        }
                    ]
                }
            },
            expectedResult: [
                {
                    entity: 'Social1',
                    domain: 'sitea.com'
                },
                {
                    entity: 'Social1',
                    domain: 'siteb.com'
                },
                {
                    entity: 'Social2',
                    domain: 'sitea.com'
                }
            ]
        }
    ]
    it('Should return the correct list of domains and networks to exlude', () => {
        const originalConfig = tdsStorage.ClickToLoadConfig

        for (const test of socialDomainExcludeTests) {
            tdsStorage.ClickToLoadConfig = test.ClickToLoadConfig
            expect(trackerutils.getDomainsToExludeByNetwork()).withContext(`test: ${test.name}`).toEqual(test.expectedResult)
        }
        tdsStorage.ClickToLoadConfig = originalConfig
    })
})

describe('trackerutils.isFirstPartyByEntity()', () => {
    let timer = Date.now()
    const jump = 1000 * 60 * 31 // slightly more than cache timeout

    beforeAll(() => {
        spyOn(settings, 'getSetting')
        tdsStorageStub.stub()

        // Make sure we don't use any list caches for these tests
        spyOn(Date, 'now').and.callFake(function () {
            // Cache may be updated on each run, so keep jumping the time forward for each call
            timer += jump
            return timer
        })

        return tdsStorage.getLists()
            .then(lists => {
                return tds.setLists(lists)
            })
    })

    const firstPartyTests = [
        { a: 'http://google-analytics.com', b: 'http://google.com', expected: true },
        { a: 'http://disqus.com', b: 'http://google.com', expected: false },
        { a: 'https://google-analytics.com/script-exception', b: 'https://example.com', expected: false }
    ]
    it('Should detect first partiness', () => {
        for (const test of firstPartyTests) {
            if (test.expected) {
                expect(trackerutils.isFirstPartyByEntity(test.a, test.b)).withContext(`test: a: ${test.a} b: ${test.b} expected: ${test.expected}`).toBeTrue()
            } else {
                expect(trackerutils.isFirstPartyByEntity(test.a, test.b)).toBeFalse()
            }
        }
    })
})
