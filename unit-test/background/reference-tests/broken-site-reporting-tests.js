import Tab from '../../../shared/js/background/classes/tab'
import { breakageReportForTab } from '../../../shared/js/background/broken-site-report'

const loadPixel = require('../../../shared/js/background/load')
const testSets = require('@duckduckgo/privacy-reference-tests/broken-site-reporting/tests.json')

for (const setName of Object.keys(testSets)) {
    const testSet = testSets[setName]

    describe(`Broken Site Reporting tests / ${testSet.name} /`, () => {
        testSet.tests.forEach(test => {
            if (test.exceptPlatforms && test.exceptPlatforms.includes('web-extension')) {
                return
            }

            it(test.name, () => {
                const loadPixelSpy = spyOn(loadPixel, 'url').and.returnValue(null)

                const trackerName = 'Ad Company'
                const trackerObj = {
                    owner: {
                        name: trackerName,
                        displayName: trackerName
                    }
                }
                const tab = new Tab({
                    url: test.siteURL
                })
                tab.upgradedHttps = test.wasUpgraded

                const addRequest = (hostname, action, opts = {}) => {
                    tab.addToTrackers({
                        action,
                        reason: 'reference tests',
                        sameEntity: false,
                        sameBaseDomain: false,
                        redirectUrl: false,
                        matchedRule: 'reference tests',
                        matchedRuleException: false,
                        tracker: trackerObj,
                        fullTrackerDomain: hostname,
                        ...opts
                    })
                }

                const addRequests = (trackers, f) => {
                    (trackers || []).forEach(hostname => {
                        const opts = f(hostname)
                        const { action } = opts
                        addRequest(hostname, action, opts)
                    })
                }

                const addActionRequests = (trackers, action) => {
                    addRequests(trackers, _ => ({ action }))
                }

                addActionRequests(test.blockedTrackers, 'block')
                addActionRequests(test.surrogates, 'redirect')
                addActionRequests(test.ignoreRequests, 'ignore')
                addActionRequests(test.ignoredByUserRequests, 'ignore-user')
                addActionRequests(test.adAttributionRequests, 'ad-attribution')
                addActionRequests(test.noActionRequests, 'none')

                breakageReportForTab({
                    tab,
                    tds: test.blocklistVersion,
                    remoteConfigEtag: test.remoteConfigEtag,
                    remoteConfigVersion: test.remoteConfigVersion,
                    category: test.category,
                    description: test.providedDescription
                })

                expect(loadPixelSpy.calls.count()).toEqual(1)

                const requestURLString = loadPixelSpy.calls.argsFor(0)[0]

                if (test.expectReportURLPrefix) {
                    expect(requestURLString.startsWith(test.expectReportURLPrefix)).toBe(true)
                }

                if (test.expectReportURLParams) {
                    const requestUrl = new URL(requestURLString)
                    // we can't use searchParams because those are automatically decoded
                    const searchItems = requestUrl.search.split('&')

                    test.expectReportURLParams.forEach(param => {
                        expect(searchItems).toContain(`${param.name}=${param.value}`)
                    })
                }
            })
        })
    })
}

describe('Broken Site Reporting tests / protections state', () => {
    function submit (tab) {
        const loadPixelSpy = spyOn(loadPixel, 'url').and.returnValue(null)
        breakageReportForTab({
            tab,
            tds: 'abc123',
            remoteConfigEtag: 'abd142',
            remoteConfigVersion: '1234',
            category: 'content',
            description: 'test'
        })
        const requestURLString = loadPixelSpy.calls.argsFor(0)[0]
        return new URL(requestURLString).searchParams
    }
    it('sends 1 when protections are enabled', () => {
        const tab = new Tab({ url: 'https://example.com' })
        spyOnProperty(tab.site, 'enabledFeatures').and.returnValue(['contentBlocking'])

        const params = submit(tab)
        expect(params.get('protectionsState')).toEqual('1')
    })
    it('sends 1 when site is denylisted', () => {
        const tab = new Tab({ url: 'https://example.com' })

        spyOnProperty(tab.site, 'enabledFeatures').and.returnValue([])
        spyOnProperty(tab.site, 'denylisted').and.returnValue(true)

        const params = submit(tab)
        expect(params.get('protectionsState')).toEqual('1')
    })
    it('sends 0 when site is allowlisted', () => {
        const tab = new Tab({ url: 'https://example.com' })
        spyOnProperty(tab.site, 'enabledFeatures').and.returnValue(['contentBlocking'])
        spyOnProperty(tab.site, 'allowlisted').and.returnValue(true)

        const params = submit(tab)
        expect(params.get('protectionsState')).toEqual('0')
    })
    it('sends 0 when contentBlocking is not enabled', () => {
        const tab = new Tab({ url: 'https://example.com' })

        // missing `contentBlocking`
        spyOnProperty(tab.site, 'enabledFeatures').and.returnValue([])

        const params = submit(tab)
        expect(params.get('protectionsState')).toEqual('0')
    })
    it('sends 0 when domain is in unprotectedTemporary', () => {
        const tab = new Tab({ url: 'https://example.com' })

        spyOnProperty(tab.site, 'enabledFeatures').and.returnValue(['contentBlocking'])
        spyOnProperty(tab.site, 'isBroken').and.returnValue(true)

        const params = submit(tab)
        expect(params.get('protectionsState')).toEqual('0')
    })
})
