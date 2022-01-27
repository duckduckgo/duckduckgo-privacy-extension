const harness = require('../helpers/harness')
const { logPageRequests } = require('../helpers/requests')
const { loadTestConfig, unloadTestConfig } = require('../helpers/testConfig')
const backgroundWait = require('../helpers/backgroundWait')

const testSite = 'https://privacy-test-pages.glitch.me/privacy-protections/youtube-click-to-load/'
const testConfig = {
    'dbg.tds.tds.trackers.youtube\\.com': {
        owner: {
            name: 'Google LLC',
            displayName: 'YouTube',
            privacyPolicy: 'https://policies.google.com/privacy?hl=en',
            url: 'http://google.com'
        },
        default: 'ignore'
    },
    'dbg.tds.tds.trackers.youtube-nocookie\\.com': {
        owner: {
            name: 'Google LLC',
            displayName: 'YouTube',
            privacyPolicy: 'https://policies.google.com/privacy?hl=en',
            url: 'http://google.com'
        },
        default: 'ignore'
    },
    'dbg.tds.ClickToLoadConfig.Google LLC': {
        domains: [
            'youtube.com',
            'youtube-nocookie.com'
        ],
        excludedSubdomains: [],
        excludedDomains: [{
            domain: 'duckduckgo.com',
            reason: 'Existing privacy protections for YouTube videos'
        }],
        elementData: {
            'YouTube embedded video': {
                selectors: [
                    'iframe[src*=\'://youtube.com/embed\']',
                    'iframe[src*=\'://youtube-nocookie.com/embed\']',
                    'iframe[src*=\'://www.youtube.com/embed\']',
                    'iframe[src*=\'://www.youtube-nocookie.com/embed\']'
                ],
                replaceSettings: {
                    type: 'youtube-video',
                    buttonText: 'Unblock Video',
                    infoTitle: 'DuckDuckGo blocked this YouTube Video',
                    infoText: 'We blocked YouTube from tracking you when the page loaded. If you unblock this Video, YouTube will know your activity.',
                    simpleInfoText: 'We blocked YouTube from tracking you when the page loaded. If you unblock this Video, YouTube will know your activity.'
                },
                clickAction: {
                    type: 'youtube-video'
                }
            },
            'YouTube embedded subscription button': {
                selectors: [
                    'iframe[src*=\'://youtube.com/subscribe_embed\']',
                    'iframe[src*=\'://youtube-nocookie.com/subscribe_embed\']',
                    'iframe[src*=\'://www.youtube.com/subscribe_embed\']',
                    'iframe[src*=\'://www.youtube-nocookie.com/subscribe_embed\']'
                ],
                replaceSettings: {
                    type: 'blank'
                }
            }
        },
        informationalModal: {},
        surrogates: [
            {
                rule: '(www.)?youtube(-nocookie)?.com/iframe_api',
                surrogate: 'youtube-iframe-api.js'
            }
        ]
    }
}

const youTubeStandardDomains = new Set(['youtu.be', 'youtube.com', 'www.youtube.com'])
const youTubeNocookieDomains = new Set(['youtube-nocookie.com', 'www.youtube-nocookie.com'])

let browser
let bgPage
let teardown

function summariseYouTubeRequests (requests) {
    const youTubeIframeApi = { checked: false, alwaysRedirected: true }
    const youTubeStandard = { blocked: 0, allowed: 0, total: 0 }
    const youTubeNocookie = { blocked: 0, allowed: 0, total: 0 }

    for (const request of requests) {
        if (request.url.href === 'https://www.youtube.com/iframe_api') {
            youTubeIframeApi.alwaysRedirected = (
                youTubeIframeApi.alwaysRedirected &&
                request.status === 'redirected' &&
                request.redirectUrl &&
                request.redirectUrl.protocol === 'chrome-extension:' &&
                request.redirectUrl.pathname.endsWith('/youtube-iframe-api.js')
            )
            youTubeIframeApi.checked = true
            continue
        }

        let stats

        if (youTubeStandardDomains.has(request.url.hostname)) {
            stats = youTubeStandard
        } else if (youTubeNocookieDomains.has(request.url.hostname)) {
            stats = youTubeNocookie
        } else {
            continue
        }

        stats.total += 1

        if (request.status === 'blocked') {
            stats.blocked += 1
        } else {
            // Consider anything not blocked as allowed, so that block tests
            // don't miss redirected requests or failed requests.
            stats.allowed += 1
        }
    }

    return { youTubeIframeApi, youTubeStandard, youTubeNocookie }
}

describe('Test YouTube Click To Load', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)

        // Overwrite the parts of the configuration needed for our tests.
        await loadTestConfig(bgPage, testConfig)
    })

    afterAll(async () => {
        // Restore the original configuration.
        await unloadTestConfig(bgPage, testConfig)

        try {
            await teardown()
        } catch (e) {}
    })

    it('CTL: YouTube request blocking/redirecting', async () => {
        // Open the test page and start logging network requests.
        const page = await browser.newPage()
        const pageRequests = []
        const clearRequests = logPageRequests(page, pageRequests)

        // Initially there should be a bunch of requests. The iframe_api should
        // be redirected to our surrogate but otherwise YouTube requests should
        // be blocked.
        await page.goto(testSite, { waitUntil: 'networkidle0' })
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie
            } = summariseYouTubeRequests(pageRequests)

            expect(youTubeIframeApi.checked).toBeTrue()
            expect(youTubeIframeApi.alwaysRedirected).toBeTrue()
            expect(youTubeStandard.total).toBeGreaterThan(5)
            expect(youTubeStandard.blocked).toEqual(youTubeStandard.total)
            expect(youTubeStandard.allowed).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(youTubeNocookie.total)
            expect(youTubeNocookie.allowed).toEqual(0)
        }

        // Once the user clicks to load a video, the iframe_api should be loaded
        // and the video should be unblocked.
        clearRequests()
        const button = await page.evaluateHandle(
            'document.querySelector("div:nth-child(2) > div")' +
            '.shadowRoot.querySelector("button")'
        )
        await button.click()
        await page.waitForNetworkIdle({ idleTime: 1000 })
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie
            } = summariseYouTubeRequests(pageRequests)

            expect(youTubeIframeApi.checked).toBeTrue()
            expect(youTubeIframeApi.alwaysRedirected).toBeFalse()
            expect(youTubeStandard.blocked).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(0)
            expect(youTubeNocookie.allowed).toBeGreaterThanOrEqual(1)
        }

        // When the page is reloaded, requests should be blocked again.
        clearRequests()
        await page.reload({ waitUntil: 'networkidle0' })
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie
            } = summariseYouTubeRequests(pageRequests)

            expect(youTubeIframeApi.checked).toBeTrue()
            expect(youTubeIframeApi.alwaysRedirected).toBeTrue()
            expect(youTubeStandard.total).toBeGreaterThan(5)
            expect(youTubeStandard.blocked).toEqual(youTubeStandard.total)
            expect(youTubeStandard.allowed).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(youTubeNocookie.total)
            expect(youTubeNocookie.allowed).toEqual(0)
        }

        // The header button should also unblock YouTube.
        clearRequests()
        const headerButton = await page.evaluateHandle(
            'document.querySelector("#short-container > div")' +
            '.shadowRoot.querySelector("#DuckDuckGoPrivacyEssentialsCTLElementTitleTextButton")'
        )
        await headerButton.click()
        await page.waitForNetworkIdle({ idleTime: 1000 })
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie
            } = summariseYouTubeRequests(pageRequests)

            expect(youTubeIframeApi.checked).toBeTrue()
            expect(youTubeIframeApi.alwaysRedirected).toBeFalse()
            expect(youTubeStandard.blocked).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(0)
            expect(youTubeNocookie.allowed).toBeGreaterThanOrEqual(1)
        }

        page.close()
    })

    it('CTL: YouTube interacting with iframe API', async () => {
        const page = await browser.newPage()
        await page.goto(testSite, { waitUntil: 'networkidle0' })

        // Test the Iframe API controls and events function correctly, even when
        // used with an existing video.
        {
            const waitForExpectedBorder = expectedBorder =>
                page.waitForFunction(expectedBorder => (
                    document.getElementById('existing-video')
                        .style.border.split(' ').pop() === expectedBorder
                ),
                { polling: 10 }, expectedBorder)

            await waitForExpectedBorder('')

            const button = await page.evaluateHandle(
                'document.querySelector("div:nth-child(7) > div")' +
                '.shadowRoot.querySelector("button")'
            )
            await button.click()
            await waitForExpectedBorder('orange')

            await page.click('#play-existing-video')
            await waitForExpectedBorder('green')

            await page.click('#pause-existing-video')
            await waitForExpectedBorder('red')
        }

        // Test the Iframe API controls a 360 video correctly.
        {
            const waitForExpectedRoll = (expectedRoll, clickFlip) =>
                page.waitForFunction((expectedRoll, clickFlip) => {
                    if (clickFlip) {
                        document.getElementById('spherical-video-flip').click()
                    }
                    return document.getElementById('spherical-video-roll')
                        .value === expectedRoll
                },
                { polling: 10 }, expectedRoll, clickFlip)

            await waitForExpectedRoll('')

            const button = await page.evaluateHandle(
                'document.querySelector("div:nth-child(8) > div")' +
                '.shadowRoot.querySelector("button")'
            )
            // Sometimes Chrome shows a media dialog that seems to cause our
            // click to not register. Focusing the button first seems to help.
            await button.focus()
            await button.click()
            await waitForExpectedRoll('0.0000')

            // Play video and keep clicking roll button until it flips. The
            // video doesn't flip until its finished loading, so this way we
            // avoid unnecessary waiting and flaky failures.
            await page.click('#spherical-video')
            await waitForExpectedRoll('180.0000', true)

            await page.click('#spherical-video-flip')
            await waitForExpectedRoll('0.0000')
        }

        page.close()
    })
})
