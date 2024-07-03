import Tab from '../../../shared/js/background/classes/tab'
import { breakageReportForTab, clearAllBrokenSiteReportTimes } from '../../../shared/js/background/broken-site-report'

const loadPixel = require('../../../shared/js/background/load')
const singleTestSets = require('@duckduckgo/privacy-reference-tests/broken-site-reporting/tests.json')
const multipleTestSets = require('@duckduckgo/privacy-reference-tests/broken-site-reporting/multiple_report_tests.json')

let loadPixelSpy

async function submitAndValidateReport (report) {
    const trackerName = 'Ad Company'
    const trackerObj = {
        owner: {
            name: trackerName,
            displayName: trackerName
        }
    }
    const tab = new Tab({
        url: report.siteURL
    })
    tab.upgradedHttps = report.wasUpgraded

    if (report.protectionsEnabled === true) {
        spyOnProperty(tab.site, 'enabledFeatures').and.returnValue(['contentBlocking'])
    } else if (report.denylisted === true) {
        spyOnProperty(tab.site, 'enabledFeatures').and.returnValue([])
        spyOnProperty(tab.site, 'denylisted').and.returnValue(true)
    }

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

    addActionRequests(report.blockedTrackers, 'block')
    addActionRequests(report.surrogates, 'redirect')
    addActionRequests(report.ignoreRequests, 'ignore')
    addActionRequests(report.ignoredByUserRequests, 'ignore-user')
    addActionRequests(report.adAttributionRequests, 'ad-attribution')
    addActionRequests(report.noActionRequests, 'none')

    const mockedPageParams = {
        userRefreshCount: 2,
        jsPerformance: [123.45],
        docReferrer: 'http://example.com'
    }

    await breakageReportForTab({
        tab,
        tds: report.blocklistVersion,
        remoteConfigEtag: report.remoteConfigEtag,
        remoteConfigVersion: report.remoteConfigVersion,
        category: report.category,
        description: report.providedDescription,
        pageParams: mockedPageParams
    })
    expect(loadPixelSpy.calls.count()).withContext('Expect only one pixel').toEqual(1)

    const requestURLString = loadPixelSpy.calls.argsFor(0)[0]
    loadPixelSpy.calls.reset()

    if (report.expectReportURLPrefix) {
        expect(requestURLString.startsWith(report.expectReportURLPrefix)).toBe(true)
    }

    if (report.expectReportURLParams) {
        const requestUrl = new URL(requestURLString)
        // we can't use searchParams because those are automatically decoded
        const searchItems = requestUrl.search.split('&')

        report.expectReportURLParams.forEach(param => {
            if ('value' in param) {
                expect(searchItems).toContain(`${param.name}=${param.value}`)
            }
            if ('matchesCurrentDay' in param) {
                const date = new Date()
                const day = String(date.getDate()).padStart(2, '0')
                const month = String(date.getMonth() + 1).padStart(2, '0')
                const year = date.getFullYear()
                const dateString = `${year}-${month}-${day}`
                expect(searchItems).toContain(`${param.name}=${dateString}`)
            }
            if ('matches' in param) {
                const regex = new RegExp(param.matches)
                const fields = searchItems.map(item => item.split('='))
                for (const [key, value] of fields) {
                    if (key === param.name) {
                        expect(value).toMatch(regex)
                    }
                }
            }
            if ('present' in param) {
                const fields = searchItems.map(item => item.split('=')[0])
                if (param.present) {
                    expect(fields).withContext(`Expected ${param.name} to be present in ${searchItems}`).toContain(param.name)
                } else {
                    expect(fields).not.toContain(param.name)
                }
            }
        })
    }
}
function runTests (testSets, supportsMultipleReports = false) {
    for (const setName of Object.keys(testSets)) {
        const testSet = testSets[setName]

        describe(`Broken Site Reporting tests / ${testSet.name} /`, () => {
            for (const test of testSet.tests) {
                if (test.exceptPlatforms && test.exceptPlatforms.includes('web-extension')) {
                    return
                }

                it(test.name, async () => {
                    loadPixelSpy = spyOn(loadPixel, 'url').and.returnValue(null)
                    await clearAllBrokenSiteReportTimes()
                    if (supportsMultipleReports) {
                        for (const report of test.reports) {
                            await submitAndValidateReport(report)
                        }
                    } else {
                        await submitAndValidateReport(test)
                    }
                })
            }
        })
    }
}

runTests(singleTestSets)
runTests(multipleTestSets, true)

describe('Broken Site Reporting tests / protections state', () => {
    async function submit (tab) {
        loadPixelSpy = spyOn(loadPixel, 'url').and.returnValue(null)
        await breakageReportForTab({
            tab,
            tds: 'abc123',
            remoteConfigEtag: 'abd142',
            remoteConfigVersion: '1234',
            category: 'content',
            description: 'test',
            pageParams: {}
        })
        const requestURLString = loadPixelSpy.calls.argsFor(0)[0]
        return new URL(requestURLString).searchParams
    }
    it('sends 1 when protections are enabled', async () => {
        const tab = new Tab({ url: 'https://example.com' })
        spyOnProperty(tab.site, 'enabledFeatures').and.returnValue(['contentBlocking'])

        const params = await submit(tab)
        expect(params.get('protectionsState')).toEqual('true')
    })
    it('sends 1 when site is denylisted', async () => {
        const tab = new Tab({ url: 'https://example.com' })

        spyOnProperty(tab.site, 'enabledFeatures').and.returnValue([])
        spyOnProperty(tab.site, 'denylisted').and.returnValue(true)

        const params = await submit(tab)
        expect(params.get('protectionsState')).toEqual('true')
    })
    it('sends 0 when site is allowlisted', async () => {
        const tab = new Tab({ url: 'https://example.com' })
        spyOnProperty(tab.site, 'enabledFeatures').and.returnValue(['contentBlocking'])
        spyOnProperty(tab.site, 'allowlisted').and.returnValue(true)

        const params = await submit(tab)
        expect(params.get('protectionsState')).toEqual('false')
    })
    it('sends 0 when contentBlocking is not enabled', async () => {
        const tab = new Tab({ url: 'https://example.com' })

        // missing `contentBlocking`
        spyOnProperty(tab.site, 'enabledFeatures').and.returnValue([])

        const params = await submit(tab)
        expect(params.get('protectionsState')).toEqual('false')
    })
    it('sends 0 when domain is in unprotectedTemporary', async () => {
        const tab = new Tab({ url: 'https://example.com' })

        spyOnProperty(tab.site, 'enabledFeatures').and.returnValue(['contentBlocking'])
        spyOnProperty(tab.site, 'isBroken').and.returnValue(true)

        const params = await submit(tab)
        expect(params.get('protectionsState')).toEqual('false')
    })
})
