require('../../helpers/mock-browser-api')

const submitBreakageForm = require('../../../shared/js/ui/models/submit-breakage-form.es6')
const pixel = require('../../../shared/js/background/pixel.es6')
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
                spyOn(browser.runtime, 'getManifest').and.returnValue({ version: '100.12' })
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
                    // normally pixel params are passed from popup to background script via messaging,
                    // we are making a shortcut here
                    firePixel: params => pixel.fire.apply(null, params),
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
