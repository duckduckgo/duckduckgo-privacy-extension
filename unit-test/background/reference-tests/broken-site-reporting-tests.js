import Tab from '../../../shared/js/background/classes/tab.es6'

require('../../helpers/mock-browser-api')

const submitBreakageForm = require('../../../shared/js/ui/models/submit-breakage-form.es6')
const submitBrokenSiteReport = require('../../../shared/js/background/broken-site-report')
const loadPixel = require('../../../shared/js/background/load.es6')
const testSets = require('../../data/reference-tests/broken-site-reporting/tests.json')

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

                test.blockedTrackers.forEach(domain => {
                    tab.addToTrackers({
                        action: 'block',
                        reason: 'matched rule - block',
                        sameEntity: false,
                        sameBaseDomain: false,
                        redirectUrl: false,
                        matchedRule: 'block',
                        matchedRuleException: false,
                        tracker: trackerObj,
                        fullTrackerDomain: domain
                    })
                })

                test.surrogates.forEach(domain => {
                    tab.addToTrackers({
                        action: 'redirect',
                        reason: 'matched rule - surrogate',
                        sameEntity: false,
                        sameBaseDomain: false,
                        redirectUrl: 'something.org/track.js',
                        matchedRule: 'block',
                        matchedRuleException: false,
                        tracker: trackerObj,
                        fullTrackerDomain: domain
                    })
                })
                submitBreakageForm.call({
                    tds: test.blocklistVersion,
                    tab,
                    // normally report params are passed from popup to background script via messaging,
                    // we are making a shortcut here
                    submitBrokenSiteReport: params => submitBrokenSiteReport.fire.apply(null, params),
                    set: () => {},
                    sendMessage: () => {}
                }, test.category)

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
