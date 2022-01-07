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

                const trackingUrls = {}

                test.blockedTrackers.forEach(domain => {
                    trackingUrls[domain] = {
                        isBlocked: true,
                        reason: 'matched rule - block'
                    }
                })

                test.surrogates.forEach(domain => {
                    trackingUrls[domain] = {
                        isBlocked: true,
                        reason: 'matched rule - surrogate'
                    }
                })

                submitBreakageForm.call({
                    tds: test.blocklistVersion,
                    tab: {
                        url: test.siteURL,
                        site: {
                            domain: ''
                        },
                        upgradedHttps: test.wasUpgraded,
                        trackersBlocked: {
                            'Tracking INC': {
                                urls: trackingUrls
                            }
                        }
                    },
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
                    test.expectReportURLParams.forEach(param => {
                        expect(requestURLString).toContain(`${param.name}=${param.value}`)
                    })
                }
            })
        })
    })
}
