import { getDomain } from 'tldts'
import { EventEmitter } from 'node:events'

import { test, expect } from './helpers/playwrightHarness'
import backgroundWait from './helpers/backgroundWait'
import { overridePrivacyConfig, overrideTds } from './helpers/testConfig'
import { routeFromLocalhost } from './helpers/testPages'
import { logPageRequests } from './helpers/requests'

const testSite = 'https://privacy-test-pages.site/privacy-protections/click-to-load/'
const facebookDomains = new Set(['facebook.com', 'facebook.net', 'fbcdn.net'])

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
    test.beforeEach(async ({ context, backgroundPage, backgroundNetworkContext }) => {
        // Overwrite the parts of the configuration needed for our tests.
        await overridePrivacyConfig(backgroundNetworkContext, 'click-to-load-facebook.json')
        await overrideTds(backgroundNetworkContext, 'click-to-load-tds.json')
        await backgroundWait.forExtensionLoaded(context)
        await backgroundWait.forAllConfiguration(backgroundPage)
    })

    test('CTL: Facebook request blocking/redirecting', async ({ page }) => {
        const facebookRequests = new EventEmitter()
        await routeFromLocalhost(page, (route) => {
            const url = route.request().url()
            if (facebookDomains.has(getDomain(url))) {
                // blocking facebook requests at this layer reports these requests as 'failed' to
                // the page request logger, allowing us to differentiate between 'blocked' requests
                // and ones which would be allowed without this route.
                if (url.includes('sdk.js')) {
                    facebookRequests.emit('sdk', url)
                }
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
            expect(allowCount).toEqual(0)
            expect(blockCount).toEqual(requestCount)

            // Note a failure, so that it's not ignored as pending later.
            blockingFailed = allowCount > 0 || blockCount < requestCount ||
                facebookSDKRedirect.alwaysRedirected === false
        }

        // Once the user clicks to load the Facebook content, the SDK should be
        // loaded and the content should be unblocked.
        clearRequests()
        const facebookSDKRequestHappened = new Promise((resolve) => {
            facebookRequests.once('sdk', resolve)
        })
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
        // wait for a facebook SDK request to happen
        await facebookSDKRequestHappened
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
        // navigate away to allow all requests to complete before we clear request data
        await page.goto('https://privacy-test-pages.site/')
        // When the page is reloaded, requests should be blocked again.
        clearRequests()
        await page.goto(testSite, { waitUntil: 'networkidle', timeout: 15000 })
        {
            const {
                requestCount, blockCount, allowCount, facebookSDKRedirect
            } = summariseFacebookRequests(pageRequests)

            expect(facebookSDKRedirect.checked).toBe(true)
            expect(facebookSDKRedirect.alwaysRedirected).toBe(true)
            expect(requestCount).toBeGreaterThan(3)
            expect(allowCount).toEqual(0)
            expect(blockCount).toEqual(requestCount)
        }
    })
})
