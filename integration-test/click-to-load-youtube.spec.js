import { test, expect } from './helpers/playwrightHarness'
import backgroundWait from './helpers/backgroundWait'
import { loadTestConfig, loadTestTds } from './helpers/testConfig'
import { routeFromLocalhost } from './helpers/testPages'
import { logPageRequests } from './helpers/requests'
import { waitForNetworkIdle } from './helpers/pageWait'

const testSite = 'https://privacy-test-pages.glitch.me/privacy-protections/youtube-click-to-load/'
const youTubeStandardDomains = new Set(['youtu.be', 'youtube.com', 'www.youtube.com'])
const youTubeNocookieDomains = new Set(['youtube-nocookie.com', 'www.youtube-nocookie.com'])
const youTubeImageDomains = new Set(['i.ytimg.com'])

/**
 * @param {import('../helpers/requests').LoggedRequestDetails[]} requests
 */
function summariseYouTubeRequests (requests) {
    const youTubeIframeApi = { checked: false, alwaysRedirected: true }
    const youTubeStandard = { blocked: 0, allowed: 0, total: 0 }
    const youTubeNocookie = { blocked: 0, allowed: 0, total: 0 }
    const youTubeImage = { blocked: 0, allowed: 0, total: 0 }
    let hasYouTubeAutoPlay = false

    for (const request of requests) {
        if (request.url.pathname === '/web_accessible_resources/youtube-iframe-api.js') {
            youTubeIframeApi.checked = true
        }

        let stats

        if (youTubeStandardDomains.has(request.url.hostname)) {
            stats = youTubeStandard
        } else if (youTubeNocookieDomains.has(request.url.hostname)) {
            stats = youTubeNocookie
        } else if (youTubeImageDomains.has(request.url.hostname)) {
            stats = youTubeImage
        } else {
            continue
        }

        if (request.url.searchParams.get('autoplay') === '1') {
            hasYouTubeAutoPlay = true
        }

        if (request.url.pathname === '/iframe_api') {
            youTubeIframeApi.alwaysRedirected = false
            youTubeIframeApi.checked = true
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

    return { youTubeIframeApi, youTubeStandard, youTubeNocookie, youTubeImage, hasYouTubeAutoPlay }
}

function overrideHandler (route) {
    const { hostname } = new URL(route.request().url())

    if (youTubeStandardDomains.has(hostname) ||
        youTubeNocookieDomains.has(hostname) ||
        youTubeImageDomains.has(hostname)) {
        route.abort()
        return true
    }

    return false
}

test.describe('Test YouTube Click To Load', () => {
    test.beforeEach(async ({ context, backgroundPage }) => {
        await backgroundWait.forExtensionLoaded(context)
        await backgroundWait.forAllConfiguration(backgroundPage)

        // Overwrite the parts of the configuration needed for our tests.
        await loadTestConfig(backgroundPage, 'click-to-load-youtube.json')
        await loadTestTds(backgroundPage, 'click-to-load-tds.json')
    })

    test('CTL: YouTube request blocking/redirecting', async ({ page }) => {
        await routeFromLocalhost(page, overrideHandler)
        const pageRequests = []
        const clearRequests = await logPageRequests(page, pageRequests)

        // Initially there should be a bunch of requests. The iframe_api should
        // be redirected to our surrogate but otherwise YouTube requests should
        // be blocked.
        await page.goto(testSite, { waitUntil: 'networkidle' })
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie, youTubeImage
            } = summariseYouTubeRequests(pageRequests)

            expect(youTubeIframeApi.checked).toBe(true)
            expect(youTubeIframeApi.alwaysRedirected).toBe(true)
            expect(youTubeStandard.total).toBeGreaterThanOrEqual(2)
            expect(youTubeStandard.blocked).toEqual(youTubeStandard.total)
            expect(youTubeStandard.allowed).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(youTubeNocookie.total)
            expect(youTubeNocookie.allowed).toEqual(0)
            expect(youTubeImage.blocked).toEqual(youTubeImage.total)
            expect(youTubeImage.allowed).toEqual(0)
        }

        // Once the user clicks to load a video, the iframe_api should be loaded
        // and the video should be unblocked but should not autoplay.
        clearRequests()
        await page.click('main > div:nth-child(2) button.primary')
        await waitForNetworkIdle(page)
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie, youTubeImage, hasYouTubeAutoPlay
            } = summariseYouTubeRequests(pageRequests)

            expect(youTubeIframeApi.checked).toBe(true)
            expect(youTubeIframeApi.alwaysRedirected).toBe(false)
            expect(youTubeStandard.blocked).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(0)
            expect(youTubeNocookie.allowed).toBeGreaterThanOrEqual(1)
            expect(youTubeImage.blocked).toEqual(0)
            expect(youTubeImage.allowed).toEqual(youTubeImage.total)
            expect(hasYouTubeAutoPlay).toBe(false)
        }

        // When the page is reloaded, requests should be blocked again.
        clearRequests()
        await page.reload({ waitUntil: 'networkidle' })
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie
            } = summariseYouTubeRequests(pageRequests)

            expect(youTubeIframeApi.checked).toBe(true)
            expect(youTubeIframeApi.alwaysRedirected).toBe(true)
            expect(youTubeStandard.total).toBeGreaterThanOrEqual(2)
            expect(youTubeStandard.blocked).toEqual(youTubeStandard.total)
            expect(youTubeStandard.allowed).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(youTubeNocookie.total)
            expect(youTubeNocookie.allowed).toEqual(0)
        }

        // The header button should also unblock YouTube.
        clearRequests()
        await page.click('#short-container #DuckDuckGoPrivacyEssentialsCTLElementTitleTextButton')
        await waitForNetworkIdle(page)
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie
            } = summariseYouTubeRequests(pageRequests)

            expect(youTubeIframeApi.checked).toBe(true)
            expect(youTubeIframeApi.alwaysRedirected).toBe(false)
            expect(youTubeStandard.blocked).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(0)
            expect(youTubeNocookie.allowed).toBeGreaterThanOrEqual(1)
        }
    })

    test('CTL: YouTube interacting with iframe API', async ({ page }) => {
        await page.goto(testSite, { waitUntil: 'networkidle' })

        // Test the Iframe API controls and events function correctly, even when
        // used with an existing video.
        {
            const waitForExpectedBorder = expectedBorder =>
                page.waitForFunction(pageExpectedBorder => {
                    const video = document.getElementById('existing-video')
                    return video?.style.border.split(' ').pop() === pageExpectedBorder
                },
                expectedBorder)

            await waitForExpectedBorder('0px')

            await page.click('#existing-video button.primary')
            await waitForExpectedBorder('orange')

            await page.click('#existing-video')
            await waitForExpectedBorder('green')

            await page.click('#pause-existing-video')
            await waitForExpectedBorder('red')

            await page.click('#play-existing-video')
            await waitForExpectedBorder('green')
        }

        // Test the Iframe API controls a 360 video correctly.
        {
            const waitForExpectedRoll = (expectedRoll, clickFlip) =>
                page.waitForFunction(({ pageExpectedRoll, pageClickFlip }) => {
                    if (pageClickFlip) {
                        document.getElementById('spherical-video-flip').click()
                    }
                    return document.getElementById('spherical-video-roll')
                        .value === pageExpectedRoll
                },
                { pageExpectedRoll: expectedRoll, pageClickFlip: clickFlip })

            await waitForExpectedRoll('')

            // Sometimes Chrome shows a media dialog that seems to cause our
            // click to not register. Focusing the button first seems to help.
            await page.focus('main > div:nth-child(8) div button.primary')
            await page.click('main > div:nth-child(8) div button.primary')
            await waitForExpectedRoll('0.0000')

            // Play video and keep clicking roll button until it flips. The
            // video doesn't flip until its finished loading, so this way we
            // avoid unnecessary waiting and flaky failures.
            await page.click('#spherical-video')
            await waitForExpectedRoll('180.0000', true)

            await page.click('#spherical-video-flip')
            await waitForExpectedRoll('0.0000', true)
        }
    })

    test('CTL: YouTube Preview', async ({ page }) => {
        await routeFromLocalhost(page, overrideHandler)
        const pageRequests = []
        const clearRequests = await logPageRequests(page, pageRequests)

        // Navigate to test page
        await page.goto(testSite, { waitUntil: 'networkidle' })

        // Once the user clicks to preview a video, should change from blocked state
        // to preview state and request only YouTube Preview images
        clearRequests()
        {
            const totalEmbeddedVideosBlocked = (await page.$$('div[id^=yt-ctl-dialog-]')).length

            // Click toggle to enable previews
            await page.click('main > div:nth-child(2) button:not(.primary)')
            await page.waitForSelector('div[data-key="modal"]')

            // Click modal button to confirm enabling YT previews
            await page.click('body > div[data-key=modal] button[data-key=allow]')
            await waitForNetworkIdle(page)

            const totalEmbeddedVideosPreviews = (await page.$$('div[id^=yt-ctl-preview-]')).length

            expect(totalEmbeddedVideosBlocked).toEqual(totalEmbeddedVideosPreviews)

            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie, youTubeImage
            } = summariseYouTubeRequests(pageRequests)

            expect(youTubeIframeApi.checked).toBe(false)
            expect(youTubeIframeApi.alwaysRedirected).toBe(true)
            expect(youTubeStandard.blocked).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(0)
            expect(youTubeNocookie.allowed).toEqual(0)
            expect(youTubeImage.blocked).toEqual(0)
            expect(youTubeImage.allowed).toBeGreaterThan(0)
        }

        // Once the user clicks to load a video, the iframe_api should be loaded
        // and the video should be unblocked and played automatically
        clearRequests()
        await page.click('main > div:nth-child(2) button.primary')
        await waitForNetworkIdle(page)
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie, hasYouTubeAutoPlay
            } = summariseYouTubeRequests(pageRequests)

            expect(youTubeIframeApi.checked).toBe(true)
            expect(youTubeIframeApi.alwaysRedirected).toBe(false)
            expect(youTubeStandard.blocked).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(0)
            expect(youTubeNocookie.allowed).toBeGreaterThanOrEqual(1)
            expect(hasYouTubeAutoPlay).toBe(true)
        }

        // When the page is reloaded, YouTube Preview should continue enabled,
        // requests should be blocked still
        // and only YouTube Preview images should be requested
        clearRequests()
        await page.reload({ waitUntil: 'networkidle' })
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie, youTubeImage
            } = summariseYouTubeRequests(pageRequests)

            expect(youTubeIframeApi.checked).toBe(true)
            expect(youTubeIframeApi.alwaysRedirected).toBe(true)
            expect(youTubeStandard.total).toBeGreaterThanOrEqual(2)
            expect(youTubeStandard.blocked).toEqual(youTubeStandard.total)
            expect(youTubeStandard.allowed).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(youTubeNocookie.total)
            expect(youTubeNocookie.allowed).toEqual(0)
            expect(youTubeImage.blocked).toEqual(0)
            expect(youTubeImage.allowed).toEqual(youTubeImage.total)
        }

        // The header button should also unblock YouTube.
        clearRequests()
        await page.click('#short-container #DuckDuckGoPrivacyEssentialsCTLElementTitleTextButton')
        await waitForNetworkIdle(page)
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie, hasYouTubeAutoPlay
            } = summariseYouTubeRequests(pageRequests)

            expect(youTubeIframeApi.checked).toBe(true)
            expect(youTubeIframeApi.alwaysRedirected).toBe(false)
            expect(youTubeStandard.blocked).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(0)
            expect(youTubeNocookie.allowed).toBeGreaterThanOrEqual(1)
            expect(hasYouTubeAutoPlay).toBe(true)
        }

        // Pressing "Previews enabled" toggle should block all YT videos again
        clearRequests()
        await page.reload({ waitUntil: 'networkidle' })
        {
            const totalEmbeddedVideosPreviews = (await page.$$('div[id^=yt-ctl-preview-]')).length
            // Click toggle to disable YT previews
            await page.click('main > div:nth-child(2) button:not(.primary)')
            await waitForNetworkIdle(page)

            const totalEmbeddedVideosBlocked = (await page.$$('div[id^=yt-ctl-dialog-]')).length

            expect(totalEmbeddedVideosBlocked).toEqual(totalEmbeddedVideosPreviews)
        }
    })
})
