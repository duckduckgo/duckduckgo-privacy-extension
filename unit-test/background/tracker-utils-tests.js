const trackerutils = require('../../shared/js/background/tracker-utils')
const tds = require('../../shared/js/background/trackers.es6')
const tdsStorage = require('../../shared/js/background/storage/tds.es6')
const tdsStorageStub = require('./../helpers/tds.es6')
const settings = require('../../shared/js/background/settings.es6')

describe('Tracker Utilities', () => {
    let settingsObserver

    beforeAll(() => {
        settingsObserver = spyOn(settings, 'getSetting')
        tdsStorageStub.stub()
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
            settingsObserver.and.returnValue(undefined)
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
})
