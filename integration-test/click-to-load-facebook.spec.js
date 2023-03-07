import { test, expect } from './helpers/playwrightHarness'
import backgroundWait from './helpers/backgroundWait'
import { loadTestConfig, loadTestTds } from './helpers/testConfig'
import { routeFromLocalhost } from './helpers/testPages'
import { getDomain } from 'tldts'

const testSite = 'https://privacy-test-pages.glitch.me/privacy-protections/click-to-load/'
const facebookDomains = new Set(['facebook.com', 'facebook.net', 'fbcdn.net'])

/**
 * Start logging requests for the given Puppeteer Page.
 * @param {import('@playwright/test').Page} page
 *   The Puppeteer page to log requests for.
 * @param {LoggedRequestDetails[]} requests
 *   Array of request details, appended to as requests happen.
 *   Note: The requests array is mutated by this function.
 * @param {function} [filter]
 *   Optional filter function that (if given) should return falsey for requests
 *   that should be ignored.
 * @returns {Promise<function>}
 *   Function that clears logged requests (and in progress requests).
 */
async function logPageRequests (page, requests, filter) {
    const requestDetailsByRequestId = new Map()

    /**
     * @param {number} requestId
     * @param {(details: LoggedRequestDetails) => void} updateDetails
     * @returns {void}
     */
    const saveRequestOutcome = (requestId, updateDetails) => {
        if (!requestDetailsByRequestId.has(requestId)) {
            return
        }

        const details = requestDetailsByRequestId.get(requestId)
        requestDetailsByRequestId.delete(requestId)
        if (!details) {
            return
        }

        updateDetails(details)

        if (!filter || filter(details)) {
            requests.push(details)
        }
    }

    page.on('request', (request) => {
        const url = request.url()
        const requestDetails = {
            url,
            method: request.method(),
            type: request.resourceType()
        }
        if (request.redirectedFrom()) {
            requestDetails.redirectUrl = request.url()
        }
        requestDetails.url = new URL(requestDetails.url)
        requestDetailsByRequestId.set(url, requestDetails)
    })
    page.on('requestfinished', (request) => {
        saveRequestOutcome(request.url(), details => {
            details.status = details.redirectUrl ? 'redirected' : 'allowed'
        })
    })
    page.on('requestfailed', (request) => {
        saveRequestOutcome(request.url(), details => {
            const { errorText } = request.failure()
            if (errorText === 'net::ERR_BLOCKED_BY_CLIENT' || errorText === 'net::ERR_ABORTED') {
                details.status = 'blocked'
                details.reason = errorText
            } else {
                details.status = 'failed'
                details.reason = errorText
            }
        })
    })
    return () => {
        requests.length = 0
        requestDetailsByRequestId.clear()
    }
}

function summariseFacebookRequests (requests) {
    const facebookSDKRedirect = { checked: false, alwaysRedirected: true }
    // Note: Requests to the SDK are not included in counts.
    let requestCount = 0
    let allowCount = 0
    let blockCount = 0

    for (const request of requests) {
        const domain = getDomain(request.url.href)

        if (request.url.pathname === '/web_accessible_resources/fb-sdk.js') {
            facebookSDKRedirect.checked = true
        }

        if (!domain) {
            // Ignore requests with no domain EG: data: URLs.
            continue
        }

        if (facebookDomains.has(domain)) {
            if (request.url.pathname === '/en_US/sdk.js') {
                facebookSDKRedirect.alwaysRedirected = false
                facebookSDKRedirect.checked = true
                continue
            }

            requestCount += 1

            if (request.status === 'blocked') {
                blockCount += 1
            } else {
                // Consider anything not blocked as allowed, so that block tests
                // don't miss redirected requests or failed requests.
                allowCount += 1
            }
        }
    }

    return { facebookSDKRedirect, requestCount, allowCount, blockCount }
}

test.describe('Test Facebook Click To Load', () => {
    test.beforeEach(async ({ context, backgroundPage }) => {
        await backgroundWait.forExtensionLoaded(context)
        await backgroundWait.forAllConfiguration(backgroundPage)

        // Overwrite the parts of the configuration needed for our tests.
        await loadTestConfig(backgroundPage, 'click-to-load-facebook.json')
        await loadTestTds(backgroundPage, 'click-to-load-tds.json')
    })

    test('CTL: Facebook request blocking/redirecting', async ({ page }) => {
        await routeFromLocalhost(page, (route) => {
            const url = route.request().url()
            if (facebookDomains.has(getDomain(url))) {
                // blocking facebook requests at this layer reports these requests as 'failed' to
                // the page request logger, allowing us to differentiate between 'blocked' requests
                // and ones which would be allowed without this route.
                route.abort()
                return true
            }
            return false
        })
        const pageRequests = []
        const clearRequests = await logPageRequests(page, pageRequests)
        let blockingFailed

        await page.goto(testSite, { waitUntil: 'networkidle' })
        {
            const {
                requestCount, blockCount, allowCount, facebookSDKRedirect
            } = summariseFacebookRequests(pageRequests)

            expect(facebookSDKRedirect.checked).toBe(true)
            expect(facebookSDKRedirect.alwaysRedirected).toBe(true)
            expect(requestCount).toBeGreaterThan(3)
            expect(blockCount).toEqual(requestCount)
            expect(allowCount).toEqual(0)

            // Note a failure, so that it's not ignored as pending later.
            blockingFailed = allowCount > 0 || blockCount < requestCount ||
                facebookSDKRedirect.alwaysRedirected === false
        }

        // Once the user clicks to load the Facebook content, the SDK should be
        // loaded and the content should be unblocked.
        clearRequests()
        const buttonCount = await page.evaluate(() => {
            globalThis.buttons =
                Array.from(document.querySelectorAll('body > div'))
                    .map(div => div.shadowRoot && div.shadowRoot.querySelector('button'))
                    .filter(button => button && button.innerText.startsWith('Unblock'))
            return globalThis.buttons.length
        })
        for (let i = 0; i < buttonCount; i++) {
            const button = await page.evaluateHandle(
                pageI => globalThis.buttons[pageI], i
            )
            try {
                await button.click()
            } catch (e) { }
        }

        await page.waitForTimeout(1000)
        {
            const {
                requestCount, blockCount, allowCount, facebookSDKRedirect
            } = summariseFacebookRequests(pageRequests)

            expect(facebookSDKRedirect.checked).toBe(true)
            expect(facebookSDKRedirect.alwaysRedirected).toBeFalsy()

            // The network is too slow for any requests to have been made.
            // Better to mark these tests as pending than to consider requests
            // to have been blocked (or not blocked).
            if (requestCount === 0 && !blockingFailed) {
                pending('Timed out waiting for Facebook requests!')
            }

            expect(requestCount).toBeGreaterThan(0)
            expect(blockCount).toEqual(0)
            expect(allowCount).toEqual(requestCount)
        }

        // When the page is reloaded, requests should be blocked again.
        clearRequests()
        await page.reload({ waitUntil: 'networkidle', timeout: 15000 })
        {
            const {
                requestCount, blockCount, allowCount, facebookSDKRedirect
            } = summariseFacebookRequests(pageRequests)

            expect(facebookSDKRedirect.checked).toBe(true)
            // FIXME - It seems that requests to the SDK are not reliably
            //         redirected after the page is reloaded.
            expect(facebookSDKRedirect.alwaysRedirected).toBe(true)
            expect(requestCount).toBeGreaterThan(3)
            expect(blockCount).toEqual(requestCount)
            expect(allowCount).toEqual(0)
        }
    })
})
