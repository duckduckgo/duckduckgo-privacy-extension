const harness = require('../helpers/harness')
const { logPageRequests } = require('../helpers/requests')
const {
    loadTestConfig,
    unloadTestConfig,
    loadTestTds
} = require('../helpers/testConfig')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')
const { setupAPISchemaTest } = require('../helpers/apiSchema')

const testSite = 'https://privacy-test-pages.glitch.me/privacy-protections/youtube-click-to-load/'
const youTubeStandardDomains = new Set(['youtu.be', 'youtube.com', 'www.youtube.com'])
const youTubeNocookieDomains = new Set(['youtube-nocookie.com', 'www.youtube-nocookie.com'])
const youTubeImageDomains = new Set(['i.ytimg.com'])

let browser
let bgPage
let teardown

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
        } else if (youTubeImageDomains.has(request.url.hostname)) {
            stats = youTubeImage
        } else {
            continue
        }

        if (request.url.searchParams.get('autoplay') === '1') {
            hasYouTubeAutoPlay = true
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

describe('Test YouTube Click To Load', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)

        // Overwrite the parts of the configuration needed for our tests.
        await loadTestConfig(bgPage, 'click-to-load-youtube.json')
        await loadTestTds(bgPage, 'click-to-load-tds.json')
    })

    afterAll(async () => {
        // Restore the original configuration.
        await unloadTestConfig(bgPage)

        try {
            await teardown()
        } catch (e) {}
    })

    it('CTL: YouTube request blocking/redirecting', async () => {
        // Open the test page and start logging network requests.
        const page = await browser.newPage()
        const pageRequests = []
        const clearRequests = await logPageRequests(page, pageRequests)

        // Initially there should be a bunch of requests. The iframe_api should
        // be redirected to our surrogate but otherwise YouTube requests should
        // be blocked.
        await pageWait.forGoto(page, testSite)
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie, youTubeImage
            } = summariseYouTubeRequests(pageRequests)

            if (!youTubeIframeApi.checked) {
                pending('1/ Timed out requesting YouTube Iframe API script.')
            }
            expect(youTubeIframeApi.alwaysRedirected).toBeTrue()
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
        const button = await page.evaluateHandle(
            'document.querySelector("div:nth-child(2) > div")' +
            '.shadowRoot.querySelector("button")'
        )
        await button.click()
        await pageWait.forNetworkIdle(page)
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie, youTubeImage, hasYouTubeAutoPlay
            } = summariseYouTubeRequests(pageRequests)

            if (!youTubeIframeApi.checked) {
                pending('2/ Timed out requesting YouTube Iframe API script.')
            }
            expect(youTubeIframeApi.alwaysRedirected).toBeFalse()
            expect(youTubeStandard.blocked).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(0)
            expect(youTubeNocookie.allowed).toBeGreaterThanOrEqual(1)
            expect(youTubeImage.blocked).toEqual(0)
            expect(youTubeImage.allowed).toEqual(youTubeImage.total)
            expect(hasYouTubeAutoPlay).toBeFalse()
        }

        // When the page is reloaded, requests should be blocked again.
        clearRequests()
        await pageWait.forReload(page)
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie
            } = summariseYouTubeRequests(pageRequests)

            if (!youTubeIframeApi.checked) {
                pending('3/ Timed out requesting YouTube Iframe API script.')
            }
            expect(youTubeIframeApi.alwaysRedirected).toBeTrue()
            expect(youTubeStandard.total).toBeGreaterThanOrEqual(2)
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
        await pageWait.forNetworkIdle(page)
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie
            } = summariseYouTubeRequests(pageRequests)

            if (!youTubeIframeApi.checked) {
                pending('4/ Timed out requesting YouTube Iframe API script.')
            }
            expect(youTubeIframeApi.alwaysRedirected).toBeFalse()
            expect(youTubeStandard.blocked).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(0)
            expect(youTubeNocookie.allowed).toBeGreaterThanOrEqual(1)
        }

        await page.close()
    })

    it('CTL: YouTube interacting with iframe API', async () => {
        const page = await browser.newPage()
        await pageWait.forGoto(page, testSite)

        // Test the Iframe API controls and events function correctly, even when
        // used with an existing video.
        {
            const waitForExpectedBorder = expectedBorder =>
                page.waitForFunction(pageExpectedBorder => (
                    document.getElementById('existing-video')
                        .style.border.split(' ').pop() === pageExpectedBorder
                ),
                { polling: 10 }, expectedBorder)

            await waitForExpectedBorder('')

            const button = await page.evaluateHandle(
                'document.querySelector("div:nth-child(7) > div")' +
                '.shadowRoot.querySelector("button")'
            )
            await button.click()
            await waitForExpectedBorder('orange')
            await pageWait.forNetworkIdle(page)

            await page.click('#play-existing-video')
            await waitForExpectedBorder('green')

            await page.click('#pause-existing-video')
            await waitForExpectedBorder('red')
        }

        // Test the Iframe API controls a 360 video correctly.
        {
            const waitForExpectedRoll = (expectedRoll, clickFlip) =>
                page.waitForFunction((pageExpectedRoll, pageClickFlip) => {
                    if (pageClickFlip) {
                        document.getElementById('spherical-video-flip').click()
                    }
                    return document.getElementById('spherical-video-roll')
                        .value === pageExpectedRoll
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
            await pageWait.forNetworkIdle(page)

            // Play video and keep clicking roll button until it flips. The
            // video doesn't flip until its finished loading, so this way we
            // avoid unnecessary waiting and flaky failures.
            await page.click('#spherical-video')
            try {
                await waitForExpectedRoll('180.0000', true)
            } catch (e) {
                // If the video fails to load within the 30 seconds allowed,
                // this test case fails. That does happen occasionally, so let's
                // note it but avoid a hard-fail.
                pending('Spherical video roll test timed out.')
            }

            await page.click('#spherical-video-flip')
            await waitForExpectedRoll('0.0000')
        }

        await page.close()
    })

    it('CTL: YouTube Preview', async () => {
        // Open the test page and start logging network requests.
        const page = await browser.newPage()
        const pageRequests = []
        const clearRequests = await logPageRequests(page, pageRequests)

        // Navigate to test page
        await pageWait.forGoto(page, testSite)

        // Once the user clicks to preview a video, should change from blocked state
        // to preview state and request only YouTube Preview images
        clearRequests()
        {
            const totalEmbeddedVideosBlocked = (await page.$$('div[id^=yt-ctl-dialog-')).length

            // Click toggle to enable previews
            const previewToggle = await page.evaluateHandle(
                'document.querySelector("div:nth-child(2) > div")' +
                '.shadowRoot.querySelector("button[data-key=yt-preview-toggle]")'
            )
            await previewToggle.click()
            await page.waitForSelector('div[data-key="modal"]')

            // Click modal button to confirm enabling YT previews
            const enablePreviewsButton = await page.evaluateHandle(
                'document.querySelector("body > div[data-key=modal]")' +
                    '.shadowRoot.querySelector("button[data-key=allow]")'
            )
            await enablePreviewsButton.click()
            await pageWait.forNetworkIdle(page)

            const totalEmbeddedVideosPreviews = (await page.$$('div[id^=yt-ctl-preview-')).length

            expect(totalEmbeddedVideosBlocked).toEqual(totalEmbeddedVideosPreviews)

            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie, youTubeImage
            } = summariseYouTubeRequests(pageRequests)

            expect(youTubeIframeApi.checked).toBeFalse()
            expect(youTubeIframeApi.alwaysRedirected).toBeTrue()
            expect(youTubeStandard.blocked).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(0)
            expect(youTubeNocookie.allowed).toEqual(0)
            expect(youTubeImage.blocked).toEqual(0)
            expect(youTubeImage.allowed).toBeGreaterThan(0)
        }

        // Once the user clicks to load a video, the iframe_api should be loaded
        // and the video should be unblocked and played automatically
        clearRequests()
        const playButton = await page.evaluateHandle(
            'document.querySelector("div:nth-child(2) > div")' +
            '.shadowRoot.querySelector("button")'
        )
        await playButton.click()
        await pageWait.forNetworkIdle(page)
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie, hasYouTubeAutoPlay
            } = summariseYouTubeRequests(pageRequests)

            if (!youTubeIframeApi.checked) {
                pending('1/ Timed out requesting YouTube Iframe API script.')
            }
            expect(youTubeIframeApi.alwaysRedirected).toBeFalse()
            expect(youTubeStandard.blocked).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(0)
            expect(youTubeNocookie.allowed).toBeGreaterThanOrEqual(1)
            expect(hasYouTubeAutoPlay).toBeTrue()
        }

        // When the page is reloaded, YouTube Preview should continue enabled,
        // requests should be blocked still
        // and only YouTube Preview images should be requested
        clearRequests()
        await pageWait.forReload(page)
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie, youTubeImage
            } = summariseYouTubeRequests(pageRequests)

            if (!youTubeIframeApi.checked) {
                pending('2/ Timed out requesting YouTube Iframe API script.')
            }
            expect(youTubeIframeApi.alwaysRedirected).toBeTrue()
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
        const headerButton = await page.evaluateHandle(
            'document.querySelector("#short-container > div")' +
            '.shadowRoot.querySelector("#DuckDuckGoPrivacyEssentialsCTLElementTitleTextButton")'
        )
        await headerButton.click()
        await pageWait.forNetworkIdle(page)
        {
            const {
                youTubeIframeApi, youTubeStandard, youTubeNocookie, hasYouTubeAutoPlay
            } = summariseYouTubeRequests(pageRequests)

            if (!youTubeIframeApi.checked) {
                pending('3/ Timed out requesting YouTube Iframe API script.')
            }
            expect(youTubeIframeApi.alwaysRedirected).toBeFalse()
            expect(youTubeStandard.blocked).toEqual(0)
            expect(youTubeNocookie.blocked).toEqual(0)
            expect(youTubeNocookie.allowed).toBeGreaterThanOrEqual(1)
            expect(hasYouTubeAutoPlay).toBeTrue()
        }

        // Pressing "Previews enabled" toggle should block all YT videos again
        clearRequests()
        await pageWait.forReload(page)
        {
            const totalEmbeddedVideosPreviews = (await page.$$('div[id^=yt-ctl-preview-')).length
            // Click toggle to disable YT previews
            const disablePreviewToggle = await page.evaluateHandle(
                'document.querySelector("div:nth-child(2) > div")' +
                '.shadowRoot.querySelector("button[data-key=yt-preview-toggle]")'
            )
            await disablePreviewToggle.click()
            await pageWait.forNetworkIdle(page)

            const totalEmbeddedVideosBlocked = (await page.$$('div[id^=yt-ctl-dialog-')).length

            expect(totalEmbeddedVideosBlocked).toEqual(totalEmbeddedVideosPreviews)
        }

        await page.close()
    })
})

describe('YouTube Iframe Player API schema', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } =
         await harness.setup({ loadExtension: false }))
    })

    afterAll(async () => {
        try {
            await teardown()
        } catch (e) {}
    })

    it('CTL: Iframe Player API schema hasn\'t changed', async () => {
        const page = await browser.newPage()
        await pageWait.forGoto(page, testSite)

        // Note: If this test fails, update
        //       /integration-test/data/api_schemas/youtube-iframe-api.json file
        //       to match
        //       /integration-test/artifacts/api_schemas/youtube-iframe-api.json
        //       and make any corresponding changes required to the surrogate
        //       script /shared/data/web_accessible_resources/youtube-iframe-api.js
        //       If no changes to the surrogate script are required, please
        //       explain why to the reviewer!

        const { actualSchema, expectedSchema } = await setupAPISchemaTest(
            page, 'youtube-iframe-api.json', ['YT', 'YTConfig']
        )
        expect(actualSchema).toEqual(expectedSchema)

        await page.close()
    })
})
