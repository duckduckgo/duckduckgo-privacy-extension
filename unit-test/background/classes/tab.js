const Tab = require('../../../shared/js/background/classes/tab')
const { LegacyTabTransfer } = require('../../../shared/js/background/classes/legacy-tab-transfer')
const tabManager = require('../../../shared/js/background/tab-manager')
const utils = require('../../../shared/js/background/utils')
const browserWrapper = require('../../../shared/js/background/wrapper')
const { TabState } = require('../../../shared/js/background/classes/tab-state')
const { AdClickAttributionPolicy } = require('../../../shared/js/background/classes/ad-click-attribution-policy')

const tdsStorageStub = require('../../helpers/tds')
const tdsStorage = require('../../../shared/js/background/storage/tds').default
const config = require('../../data/extension-config.json')

let tab

describe('Tab', () => {
    describe('updateSite()', () => {
        beforeEach(() => {
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
        beforeEach(async () => {
            tdsStorageStub.stub({ config })

            await tdsStorage.getLists()

            // TODO ensure we have stored this into session storage before moving on
            tab = tabManager.create({
                id: 123,
                requestId: 123,
                url: 'http://example.com',
                status: 200
            })
            await TabState.done()
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
                referrer: null,
                adClick: null,
                disabledClickToLoadRuleActions: [],
                dnrRuleIdsByDisabledClickToLoadRuleAction: {},
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
                statusCode: null,
                ctlYouTube: false
            }
            expect(tabClone.site.enabledFeatures.length).toBe(14)
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

    describe('restore tabs real tab objects', () => {
        beforeEach(async () => {
            tdsStorageStub.stub({ config })

            await tdsStorage.getLists()

            // TODO ensure we have stored this into session storage before moving on
            tab = tabManager.create({
                id: 212,
                requestId: 222,
                url: 'http://example.com',
                status: 200
            })
            await TabState.done()
        })

        it('tab state can be rebuilt again from state', async () => {
            const trackerName = 'Ad Company'
            const trackerObj = {
                owner: {
                    name: trackerName,
                    displayName: trackerName
                }
            }
            const domain = 'http://example.com'
            const tracker = {
                action: 'block',
                reason: 'matched rule - block',
                sameEntity: false,
                sameBaseDomain: false,
                redirectUrl: false,
                matchedRule: 'block',
                matchedRuleException: false,
                tracker: trackerObj,
                fullTrackerDomain: domain
            }
            tab.site.addTracker(tracker)
            tab.addToTrackers(tracker)
            const policy = new AdClickAttributionPolicy()
            const parameterDomain = policy.linkFormats[0].adDomainParameterName
            const baseDomain = 'example.com'
            const linkHostname = policy.linkFormats[0].url
            const selectedLink = `https://${linkHostname}?${parameterDomain}=${baseDomain}`
            tab.setAdClickIfValidRedirect(selectedLink)
            expect(tab.adClick).not.toBeUndefined()
            expect(tab.adClick).not.toBeNull()
            await TabState.done()
            delete tabManager.tabContainer[123]
            const fetchedRestoredTab = await tabManager.getOrRestoreTab(212)
            expect(fetchedRestoredTab).not.toBeUndefined()
            expect(fetchedRestoredTab.url).toEqual(tab.url)
            expect(fetchedRestoredTab.adClick).not.toBeUndefined()
            expect(fetchedRestoredTab.adClick).not.toBeNull()
            expect(fetchedRestoredTab.trackers).not.toBeUndefined()
            expect(Object.keys(fetchedRestoredTab.trackers).length).toEqual(1)
            // Ensure that deleting the data and storing again doesn't impact values
            delete tabManager.tabContainer[123]
            const fetchedRestoredTab2 = await tabManager.getOrRestoreTab(212)
            expect(fetchedRestoredTab2).not.toBeUndefined()
            expect(fetchedRestoredTab2.url).toEqual(tab.url)
            expect(fetchedRestoredTab2.adClick).not.toBeUndefined()
            expect(fetchedRestoredTab2.adClick).not.toBeNull()
            expect(fetchedRestoredTab2.adClick.adBaseDomain).toEqual(baseDomain)
            expect(fetchedRestoredTab2.trackers).not.toBeUndefined()
            expect(Object.keys(fetchedRestoredTab2.trackers).length).toEqual(1)
            // Verify tracker data
            const trackerData = fetchedRestoredTab2.trackers[trackerName]
            expect(trackerData.displayName).toEqual(tracker.tracker.owner.displayName)
            expect(trackerData.count).toEqual(1)
            expect(Object.keys(trackerData.urls).length).toEqual(1)
        })
    })
})
