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
        for (let tracker of knownTrackers) {
            expect(trackerutils.isTracker(tracker)).toBeTruthy()
        }
    })

    const notTrackers = [
        'http://not-google-analytics.com',
        'http://www.justarandompersonalsite.com'
    ]
    it('Should identify a non-tracker correctly', () => {
        for (let tracker of notTrackers) {
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
        for (let test of entityTests) {
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
        for (let test of referrerSameEntityTests) {
            expect(trackerutils.truncateReferrer(test.referrer, test.target)).toEqual(test.expectedReferrer)
        }
    })

    const referrerSafelistTests = [
        {
            name: 'referrer is safelisted',
            referrer: 'http://siteA.com',
            target: 'http://siteB.com',
            safelist: {'sitea.com': true},
            expectedReferrer: undefined
        },
        {
            name: 'target is safelisted',
            referrer: 'http://siteA.com',
            target: 'http://siteB.com',
            safelist: {'siteb.com': true},
            expectedReferrer: undefined
        },
        {
            name: 'referrer & target are safelisted',
            referrer: 'http://siteA.com',
            target: 'http://siteB.com',
            safelist: {'sitea.com': true, 'siteb.com': true},
            expectedReferrer: undefined
        },
        {
            name: 'subdomain of safelisted target',
            referrer: 'http://siteA.com',
            target: 'http://subdomain.siteB.com',
            safelist: {'siteb.com': true},
            expectedReferrer: undefined
        }
    ]
    it('Should not modify referrer when either site is safe listed', () => {
        for (let test of referrerSafelistTests) {
            settingsObserver.and.returnValue(test.safelist)
            expect(trackerutils.truncateReferrer(test.referrer, test.target)).withContext(`safelist: ${test.name}`).toEqual(test.expectedReferrer)
        }
    })

    const referrerTruncationTests = [
        {
            referrer: 'http://siteA.com/article/1',
            target: 'http://siteB.com',
            expectedReferrer: 'http://sitea.com'
        }
    ]
    it('Should modify referrer when referrer != target', () => {
        settingsObserver.and.returnValue(undefined)
        for (let test of referrerTruncationTests) {
            console.log(`${test.referrer} -> ${test.target}. referer: ${trackerutils.truncateReferrer(test.referrer, test.target)}`)
            expect(trackerutils.truncateReferrer(test.referrer, test.target)).toEqual(test.expectedReferrer)
        }
    })
})
