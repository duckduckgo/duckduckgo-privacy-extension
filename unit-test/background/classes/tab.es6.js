const Tab = require('../../../shared/js/background/classes/tab.es6')
const { LegacyTabTransfer } = require('../../../shared/js/background/classes/legacy-tab-transfer')
const tabManager = require('../../../shared/js/background/tab-manager.es6')
const utils = require('../../../shared/js/background/utils.es6')
const browserWrapper = require('../../../shared/js/background/wrapper.es6')

let tab

describe('Tab', () => {
    describe('updateSite()', () => {
        beforeEach(() => {
            spyOn(browserWrapper, 'setBadgeIcon')
            spyOn(browserWrapper, 'getExtensionId').and.returnValue('sdf')

            tab = new Tab({
                id: 123,
                requestId: 123,
                url: 'http://example.com',
                status: 200
            })
        })
        it('should update the site object if the URL is different', () => {
            const originalSite = tab.site

            tab.updateSite('https://example.com')

            expect(tab.site.url).toEqual('https://example.com')
            expect(originalSite).not.toBe(tab.site)
        })
        it('should not update the site object if the URL is different', () => {
            const originalSite = tab.site

            tab.updateSite('http://example.com')

            expect(tab.site.url).toEqual('http://example.com')
            expect(originalSite).toBe(tab.site)
        })
    })

    describe('restore tabs', () => {
        beforeEach(() => {
            // TODO ensure we have stored this into session storage before moving on
            tab = tabManager.create({
                id: 123,
                requestId: 123,
                url: 'http://example.com',
                status: 200
            })
        })
        it('should serialize to the correct legacy state', () => {
            const tabClone = new LegacyTabTransfer(tab)
            function getExpectedEnabledFeatures (url) {
                return utils.getEnabledFeatures(url)
            }
            const url = 'http://example.com'
            const tabSnapshot = {
                site: {
                    url: 'http://example.com',
                    trackerUrls: [],
                    grade: {
                        https: false,
                        httpsAutoUpgrade: false,
                        privacyScore: 2,
                        entitiesBlocked: {},
                        entitiesNotBlocked: {},
                        scores: null
                    },
                    didIncrementCompaniesData: false,
                    tosdr: {},
                    specialDomainName: null,
                    clickToLoad: [],
                    allowlisted: false,
                    allowlistOptIn: false,
                    denylisted: false,
                    isBroken: false,
                    enabledFeatures: getExpectedEnabledFeatures(url),
                    domain: 'example.com',
                    domainWWW: 'example.com',
                    protocol: 'http',
                    baseDomain: 'example.com',
                    parentEntity: '',
                    parentPrevalence: 0
                },
                httpsRedirects: {
                    failedUpgradeHosts: {},
                    redirectCounts: {},
                    mainFrameRedirect: null,
                    clearMainFrameTimeout: null
                },
                webResourceAccess: [],
                surrogates: {},
                adClick: null,
                trackers: {},
                url: 'http://example.com',
                id: 123,
                upgradedHttps: false,
                hasHttpsError: false,
                mainFrameUpgraded: false,
                urlParametersRemoved: false,
                urlParametersRemovedUrl: null,
                ampUrl: null,
                cleanAmpUrl: null,
                requestId: 123,
                status: 200,
                statusCode: null
            }
            expect(JSON.stringify(tabClone, null, 4)).toEqual(JSON.stringify(tabSnapshot, null, 4))
        })
        it('should be able to get the tab from tab manager', () => {
            const fetchedTab = tabManager.get({ tabId: 123 })
            expect(fetchedTab).not.toBeUndefined()
            expect(fetchedTab.url).toEqual(tab.url)
        })
        it('should be able to get the tab from tab manager after being deleted', async () => {
            // Simulate the service worker closing.
            delete tabManager.tabContainer[123]
            const fetchedTab = tabManager.get({ tabId: 123 })
            expect(fetchedTab).toBeUndefined()
            const fetchedRestoredTab = await tabManager.getOrRestoreTab(123)
            expect(fetchedRestoredTab).not.toBeUndefined()
            expect(fetchedRestoredTab.url).toEqual(tab.url)
        })
        it('should be able to restore the tab and modify state and then restore again', async () => {
            // Simulate the service worker closing.
            delete tabManager.tabContainer[123]
            const fetchedRestoredTab = await tabManager.getOrRestoreTab(123)
            expect(fetchedRestoredTab).not.toBeUndefined()
            expect(fetchedRestoredTab.url).toEqual(tab.url)
            fetchedRestoredTab.url = 'http://example2.com'
            delete tabManager.tabContainer[123]
            const fetchedRestoredTab2 = await tabManager.getOrRestoreTab(123)
            expect(fetchedRestoredTab2).not.toBeUndefined()
            expect(fetchedRestoredTab2.url).toEqual('http://example2.com')
        })

        it('should be able to restore the tab and modify state and then restore again', async () => {
            // Simulate the service worker closing.
            delete tabManager.tabContainer[123]
            const fetchedRestoredTab = await tabManager.getOrRestoreTab(123)
            expect(fetchedRestoredTab).not.toBeUndefined()
            expect(fetchedRestoredTab.url).toEqual(tab.url)

            const setters = Object.entries(Object.getOwnPropertyDescriptors(Tab)).filter(([key, descriptor]) => typeof descriptor.set === 'function')

            // Set all the properties to something different
            const marker = '::::::::::::::::::::marker::::::::::::::::::::'
            for (const [key] of setters) {
                fetchedRestoredTab[key] = marker
            }

            delete tabManager.tabContainer[123]
            const fetchedRestoredTab2 = await tabManager.getOrRestoreTab(123)
            expect(fetchedRestoredTab2).not.toBeUndefined()
            for (const [key] of setters) {
                // Check that the property was restored to the set value
                expect(fetchedRestoredTab[key]).toEqual(marker)
            }
        })
    })
})
