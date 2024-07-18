import config from '../data/extension-config.json'
import tdsStorageStub from '../helpers/tds'
import {
    _formatPixelRequestForTesting
} from '../../shared/js/shared-utils/pixels'
import {
    AdClickAttributionPolicy,
    sendPageloadsWithAdAttributionPixelAndResetCount
} from '../../shared/js/background/classes/ad-click-attribution-policy'
import tabManager from '../../shared/js/background/tab-manager'
import trackers from '../../shared/js/background/trackers'
import tdsStorage from '../../shared/js/background/storage/tds'
import load from '../../shared/js/background/load'

function createAdClickAttributionPolicy (policy = {}) {
    // This is not ideal, but it's the only way to get the policy to
    // load the expected data. Stubs aren't working through imports.
    const adClickAttributionPolicy = new AdClickAttributionPolicy()
    if (!policy.allowlist) {
        policy.allowlist = config.features.adClickAttribution.settings.allowlist
    }
    for (const [key, value] of Object.entries(policy)) {
        adClickAttributionPolicy[key] = value
    }

    return adClickAttributionPolicy
}

describe('check policy', () => {
    let adClickAttributionPolicy
    beforeEach(async () => {
        adClickAttributionPolicy = createAdClickAttributionPolicy()
        expect(adClickAttributionPolicy.allowlist.length).not.toEqual(0)
    })
    it('should return false if url is not expected to match', () => {
        const invalidCases = [
            'https://www.google.com/',
            'https://converters.ad-company.site/',
            'https://convert.ad-company.site.other.com/',
            'https://convert.ad-company.sitething.com/',
            'https://convert.ad-company.site.other.com/path/to/file.html',
            'https://bigconvert.ad-company.site/',
            'https://bigconvert.ad-company.site/path/to/file.html'
        ]
        for (const url of invalidCases) {
            expect(adClickAttributionPolicy.resourcePermitted(url))
                .withContext(`Expect url: ${url} to be blocked`)
                .toBe(false)
        }
    })
    it('should return true if url is expected to match', () => {
        const validCases = [
            'https://convert.ad-company.example/',
            'https://convert.ad-company.site/',
            'https://convert.ad-company.site/url/test/case.sjs',
            'https://convert.ad-company.site/url/test/case.sjs?param=value',
            'https://convert.ad-company.site/url/test/case.sjs?param=value&param2=value2',
            'https://other.convert.ad-company.site/',
            'https://other.convert.ad-company.site/url/test/case.sjs',
            'https://other.convert.ad-company.site/url/test/case.sjs?param=value'
        ]
        for (const url of validCases) {
            expect(adClickAttributionPolicy.resourcePermitted(url))
                .withContext(`Expect url: ${url} to be permitted`)
                .toBe(true)
        }
    })
})

describe('pixels', () => {
    const actualSentPixels = []
    const tabId = 123

    const expectPixels = async ({
        startUrl, adClickUrl, heuristicDomain = null, navigations = [], policy,
        sendPageloadCountPixel = true, context, expectedPixels
    }) => {
        actualSentPixels.length = 0

        let tab = tabManager.create({ tabId, url: startUrl })
        tab._adClickAttributionPolicy = createAdClickAttributionPolicy(policy)
        tab.setAdClickIfValidRedirect(adClickUrl)

        tab.adClick.sendAdClickDetectedPixel(heuristicDomain)
        for (const { url: navigationUrl, subRequests } of navigations) {
            tab = tabManager.create({ tabId, url: navigationUrl })

            for (const { url: subRequestUrl, allowed: expectedAllowed } of subRequests) {
                const subRequestContext =
                    `${context}\nSubrequest: ${subRequestUrl} ` +
                      `${expectedAllowed ? 'should' : 'shouldn\'t'} be allowed.`

                expect(tab.allowAdAttribution(subRequestUrl))
                    .withContext(subRequestContext)
                    .toEqual(expectedAllowed)
            }
        }
        if (sendPageloadCountPixel) {
            await sendPageloadsWithAdAttributionPixelAndResetCount()
        }

        expect(actualSentPixels).withContext(context).toEqual(expectedPixels)
    }

    beforeAll(async () => {
        tdsStorageStub.stub({ config })
        await trackers.setLists(await tdsStorage.getLists())

        spyOn(load, 'url').and.callFake(
            url => {
                const pixel = _formatPixelRequestForTesting(url)
                if (pixel) {
                    actualSentPixels.push(pixel)
                }
            }
        )
    })

    beforeEach(async () => {
        await sendPageloadsWithAdAttributionPixelAndResetCount()
        actualSentPixels.length = 0
    })

    it('should send the correct the m_ad_click_detected pixel parameters', async () => {
        await expectPixels({
            startUrl: 'https://duckduckgo.com',
            policy: { },
            adClickUrl: 'https://duckduckgo.com/y.js?ad_domain=',
            navigations: [],
            sendPageloadCountPixel: false,
            context: 'No ad click domain available.',
            expectedPixels: [{
                name: 'm_ad_click_detected_extension_chrome',
                params: {
                    appVersion: '1234.56',
                    domainDetection: 'none',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            }]
        })

        await expectPixels({
            startUrl: 'https://duckduckgo.com',
            policy: {
                domainDetectionEnabled: false
            },
            adClickUrl: 'https://duckduckgo.com/y.js?ad_domain=example.com',
            navigations: [],
            sendPageloadCountPixel: false,
            context: 'Param domain ignored, no heuristic domain.',
            expectedPixels: [{
                name: 'm_ad_click_detected_extension_chrome',
                params: {
                    appVersion: '1234.56',
                    domainDetection: 'none',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '0'
                }
            }]
        })

        await expectPixels({
            startUrl: 'https://duckduckgo.com',
            policy: {
                heuristicDetectionEnabled: false
            },
            adClickUrl: 'https://duckduckgo.com/y.js?ad_domain=',
            heuristicDomain: 'example.com',
            navigations: [],
            sendPageloadCountPixel: false,
            context: 'Heuristic domain ignored, no param domain.',
            expectedPixels: [{
                name: 'm_ad_click_detected_extension_chrome',
                params: {
                    appVersion: '1234.56',
                    domainDetection: 'none',
                    heuristicDetectionEnabled: '0',
                    domainDetectionEnabled: '1'
                }
            }]
        })

        await expectPixels({
            startUrl: 'https://duckduckgo.com',
            policy: {
                domainDetectionEnabled: false,
                heuristicDetectionEnabled: false
            },
            adClickUrl: 'https://duckduckgo.com/y.js?ad_domain=example.com',
            heuristicDomain: 'example.com',
            navigations: [],
            sendPageloadCountPixel: false,
            context: 'All domains ignored.',
            expectedPixels: [{
                name: 'm_ad_click_detected_extension_chrome',
                params: {
                    appVersion: '1234.56',
                    domainDetection: 'none',
                    heuristicDetectionEnabled: '0',
                    domainDetectionEnabled: '0'
                }
            }]
        })

        await expectPixels({
            startUrl: 'https://duckduckgo.com',
            policy: { },
            adClickUrl: 'https://duckduckgo.com/y.js?ad_domain=example.com',
            navigations: [],
            sendPageloadCountPixel: false,
            context: 'Only param domain.',
            expectedPixels: [{
                name: 'm_ad_click_detected_extension_chrome',
                params: {
                    appVersion: '1234.56',
                    domainDetection: 'serp_only',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            }]
        })

        await expectPixels({
            startUrl: 'https://duckduckgo.com',
            policy: { },
            adClickUrl: 'https://duckduckgo.com/y.js?ad_domain=',
            heuristicDomain: 'example.com',
            navigations: [],
            sendPageloadCountPixel: false,
            context: 'Only heuristic domain.',
            expectedPixels: [{
                name: 'm_ad_click_detected_extension_chrome',
                params: {
                    appVersion: '1234.56',
                    domainDetection: 'heuristic_only',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            }]
        })

        await expectPixels({
            startUrl: 'https://duckduckgo.com',
            policy: { },
            adClickUrl: 'https://duckduckgo.com/y.js?ad_domain=example.com',
            heuristicDomain: 'example.com',
            navigations: [],
            sendPageloadCountPixel: false,
            context: 'Domains match.',
            expectedPixels: [{
                name: 'm_ad_click_detected_extension_chrome',
                params: {
                    appVersion: '1234.56',
                    domainDetection: 'matched',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            }]
        })

        await expectPixels({
            startUrl: 'https://duckduckgo.com',
            policy: { },
            adClickUrl: 'https://duckduckgo.com/y.js?ad_domain=www.example.com',
            heuristicDomain: 'example.com',
            navigations: [],
            sendPageloadCountPixel: false,
            context: 'Domains match (with www. subdomain).',
            expectedPixels: [{
                name: 'm_ad_click_detected_extension_chrome',
                params: {
                    appVersion: '1234.56',
                    domainDetection: 'matched',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            }]
        })

        await expectPixels({
            startUrl: 'https://duckduckgo.com',
            policy: { },
            adClickUrl: 'https://duckduckgo.com/y.js?ad_domain=example.com',
            heuristicDomain: 'foo.example',
            navigations: [],
            sendPageloadCountPixel: false,
            context: 'Domains don\'t match.',
            expectedPixels: [{
                name: 'm_ad_click_detected_extension_chrome',
                params: {
                    appVersion: '1234.56',
                    domainDetection: 'mismatch',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            }]
        })
    })

    it('should send the correct the m_ad_click_active pixel at the right times', async () => {
        await expectPixels({
            startUrl: 'https://duckduckgo.com',
            policy: { },
            adClickUrl: 'https://duckduckgo.com/y.js?ad_domain=example.com',
            navigations: [
                {
                    url: 'https://foo.example/page',
                    subRequests: [
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: false
                        },
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: false
                        }
                    ]
                }

            ],
            sendPageloadCountPixel: false,
            context: 'Navigated to wrong domain, so not sent.',
            expectedPixels: [{
                name: 'm_ad_click_detected_extension_chrome',
                params: {
                    appVersion: '1234.56',
                    domainDetection: 'serp_only',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            }]
        })

        await expectPixels({
            startUrl: 'https://duckduckgo.com',
            policy: { },
            adClickUrl: 'https://duckduckgo.com/y.js?ad_domain=example.com',
            navigations: [
                {
                    url: 'https://example.com/page',
                    subRequests: [
                        {
                            url: 'https://ad-company.example/tracker.js',
                            allowed: false
                        },
                        {
                            url: 'https://different.example.com/convert.js',
                            allowed: false
                        }
                    ]
                }

            ],
            sendPageloadCountPixel: false,
            context: 'No allowed requests, so not sent.',
            expectedPixels: [{
                name: 'm_ad_click_detected_extension_chrome',
                params: {
                    appVersion: '1234.56',
                    domainDetection: 'serp_only',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            }]
        })

        await expectPixels({
            startUrl: 'https://duckduckgo.com',
            policy: { },
            adClickUrl: 'https://duckduckgo.com/y.js?ad_domain=example.com',
            navigations: [
                {
                    url: 'https://example.com/page',
                    subRequests: [
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        },
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        },
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        },
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        }
                    ]
                }
            ],
            sendPageloadCountPixel: false,
            context: 'One navigation, four allowed requests.',
            expectedPixels: [{
                name: 'm_ad_click_detected_extension_chrome',
                params: {
                    appVersion: '1234.56',
                    domainDetection: 'serp_only',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            }, {
                name: 'm_ad_click_active_extension_chrome',
                params: {
                    appVersion: '1234.56'
                }
            }]
        })

        await expectPixels({
            startUrl: 'https://duckduckgo.com',
            policy: { },
            adClickUrl: 'https://duckduckgo.com/y.js?ad_domain=example.com',
            navigations: [
                {
                    url: 'https://example.com/page',
                    subRequests: [
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        },
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        },
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        },
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        }
                    ]
                },
                {
                    url: 'https://example.com/page2',
                    subRequests: [
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        },
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        }
                    ]
                }
            ],
            sendPageloadCountPixel: false,
            context: 'Two navigation, six allowed requests.',
            expectedPixels: [{
                name: 'm_ad_click_detected_extension_chrome',
                params: {
                    appVersion: '1234.56',
                    domainDetection: 'serp_only',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            }, {
                name: 'm_ad_click_active_extension_chrome',
                params: {
                    appVersion: '1234.56'
                }
            }]
        })
    })

    it('should send the correct the m_pageloads_with_ad_attribution pixel with correct count', async () => {
        await expectPixels({
            startUrl: 'https://duckduckgo.com',
            policy: { },
            adClickUrl: 'https://duckduckgo.com/y.js?ad_domain=example.com',
            navigations: [],
            context: 'No navigations.',
            expectedPixels: [{
                name: 'm_ad_click_detected_extension_chrome',
                params: {
                    appVersion: '1234.56',
                    domainDetection: 'serp_only',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            }]
        })

        await expectPixels({
            startUrl: 'https://duckduckgo.com',
            policy: { },
            adClickUrl: 'https://duckduckgo.com/y.js?ad_domain=example.com',
            navigations: [
                {
                    url: 'https://example.com/page',
                    subRequests: [
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        },
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        },
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        },
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        }
                    ]
                },
                {
                    url: 'https://example.com/page2',
                    subRequests: [
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        },
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        }
                    ]
                },
                {
                    url: 'https://foo.example/wrong',
                    subRequests: [
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: false
                        },
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: false
                        },
                        {
                            url: 'https://ad-company.example/tracker.js',
                            allowed: false
                        }
                    ]
                },
                {
                    url: 'https://example.com/page3',
                    subRequests: [
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        }
                    ]
                },
                {
                    url: 'https://example.com/page4',
                    subRequests: [
                        {
                            url: 'https://ad-company.example/tracker.js',
                            allowed: false
                        }
                    ]
                }
            ],
            context: 'Five navigations (one wrong), seven allowed requests.',
            expectedPixels: [{
                name: 'm_ad_click_detected_extension_chrome',
                params: {
                    appVersion: '1234.56',
                    domainDetection: 'serp_only',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            }, {
                name: 'm_ad_click_active_extension_chrome',
                params: {
                    appVersion: '1234.56'
                }
            }, {
                name: 'm_pageloads_with_ad_attribution_extension_chrome',
                params: {
                    count: '3'
                }
            }]
        })

        // Test again, to ensure count was reset last time.
        await expectPixels({
            startUrl: 'https://duckduckgo.com',
            policy: { },
            adClickUrl: 'https://duckduckgo.com/y.js?ad_domain=example.com',
            navigations: [
                {
                    url: 'https://example.com/page',
                    subRequests: [
                        {
                            url: 'https://convert.ad-company.example/convert.js',
                            allowed: true
                        }
                    ]
                }
            ],
            context: 'One navigation, two allowed requests',
            expectedPixels: [{
                name: 'm_ad_click_detected_extension_chrome',
                params: {
                    appVersion: '1234.56',
                    domainDetection: 'serp_only',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            }, {
                name: 'm_ad_click_active_extension_chrome',
                params: {
                    appVersion: '1234.56'
                }
            }, {
                name: 'm_pageloads_with_ad_attribution_extension_chrome',
                params: {
                    count: '1'
                }
            }]
        })
    })
})
