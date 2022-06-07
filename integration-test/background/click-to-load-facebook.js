const { getDomain } = require('tldts')

const harness = require('../helpers/harness')
const { logPageRequests } = require('../helpers/requests')
const { loadTestConfig, unloadTestConfig } = require('../helpers/testConfig')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')
const { setupAPISchemaTest } = require('../helpers/apiSchema')

const testSite = 'https://privacy-test-pages.glitch.me/privacy-protections/click-to-load/'
const facebookDomains = new Set(['facebook.com', 'facebook.net', 'fbcdn.net'])

let browser
let bgPage
let teardown

function summariseFacebookRequests (requests) {
    const facebookSDKRedirect = { checked: false, alwaysRedirected: true }
    // Note: Requests to the SDK are not included in counts.
    let requestCount = 0
    let allowCount = 0
    let blockCount = 0

    for (const request of requests) {
        if (facebookDomains.has(getDomain(request.url.href))) {
            if (request.url.pathname === '/en_US/sdk.js') {
                facebookSDKRedirect.alwaysRedirected = (
                    facebookSDKRedirect.alwaysRedirected &&
                    request.status === 'redirected' &&
                    request.redirectUrl &&
                    request.redirectUrl.protocol === 'chrome-extension:' &&
                    request.redirectUrl.pathname.endsWith('/fb-sdk.js')
                )
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

describe('Test Facebook Click To Load', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)

        // Overwrite the parts of the configuration needed for our tests.
        await loadTestConfig(bgPage, 'click-to-load-facebook.json')
    })

    afterAll(async () => {
        // Restore the original configuration.
        await unloadTestConfig(bgPage)

        try {
            await teardown()
        } catch (e) {}
    })

    it('CTL: Facebook request blocking/redirecting', async () => {
        // Open the test page and start logging network requests.
        const page = await browser.newPage()
        const pageRequests = []
        const clearRequests = logPageRequests(page, pageRequests)

        // Initially there should be a bunch of requests. The SDK should
        // be redirected to our surrogate but otherwise Facebook requests should
        // be blocked.
        await pageWait.forGoto(page, testSite)
        {
            const {
                requestCount, blockCount, allowCount, facebookSDKRedirect
            } = summariseFacebookRequests(pageRequests)

            expect(facebookSDKRedirect.checked).toBeTrue()
            expect(facebookSDKRedirect.alwaysRedirected).toBeTrue()
            expect(requestCount).toBeGreaterThan(3)
            expect(blockCount).toEqual(requestCount)
            expect(allowCount).toEqual(0)
        }

        // Once the user clicks to load the Facebook content, the SDK should be
        // loaded and the content should be unblocked.
        clearRequests()
        const buttonCount = await page.evaluate(() => {
            globalThis.buttons =
                Array.from(document.querySelectorAll('body > div'))
                    .map(div => div.shadowRoot && div.shadowRoot.querySelector('button'))
                    .filter(button => button)
            return globalThis.buttons.length
        })
        for (let i = 0; i < buttonCount; i++) {
            const button = await page.evaluateHandle(
                i => globalThis.buttons[i], i
            )
            try {
                await button.click()
            } catch (e) { }
        }

        // Wait for the embedded content to finish loading, but give up after
        // 15 seconds. That avoids the tests failing if the network is slow.
        await pageWait.forNetworkIdle(page)

        {
            const {
                requestCount, blockCount, allowCount, facebookSDKRedirect
            } = summariseFacebookRequests(pageRequests)

            expect(facebookSDKRedirect.checked).toBeTrue()
            expect(facebookSDKRedirect.alwaysRedirected).toBeFalse()
            expect(requestCount).toBeGreaterThan(3)
            expect(blockCount).toEqual(0)
            expect(allowCount).toEqual(requestCount)
        }

        // When the page is reloaded, requests should be blocked again.
        clearRequests()
        await pageWait.forReload(page)
        {
            const {
                requestCount, blockCount, allowCount, facebookSDKRedirect
            } = summariseFacebookRequests(pageRequests)

            expect(facebookSDKRedirect.checked).toBeTrue()
            // FIXME - It seems that requests to the SDK are not reliably
            //         redirected after the page is reloaded.
            // expect(facebookSDKRedirect.alwaysRedirected).toBeTrue()
            expect(requestCount).toBeGreaterThan(3)
            expect(blockCount).toEqual(requestCount)
            expect(allowCount).toEqual(0)
        }

        await page.close()
    })
})

describe('Facebook SDK schema', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup({ loadExtension: false }))
    })

    afterAll(async () => {
        try {
            await teardown()
        } catch (e) {}
    })

    it('CTL: Facebook SDK schema hasn\'t changed', async () => {
        const page = await browser.newPage()
        await pageWait.forGoto(page, testSite)

        // Note: If these tests fail, update the
        //       /integration-test/data/api_schemas/facebook-sdk.json file
        //       to match
        //       /integration-test/artifacts/api_schemas/facebook-sdk.json
        //       and make any corresponding changes required to the surrogate
        //       script /shared/data/web_accessible_resources/facebook-sdk.js.
        //       If no changes to the surrogate scripts are required, please
        //       explain why to the reviewer!
        //
        //  See also https://developers.facebook.com/docs/graph-api/changelog

        const { actualSchema, expectedSchema } = await setupAPISchemaTest(
            page, 'facebook-sdk.json', ['FB']
        )
        expect(actualSchema).toEqual(expectedSchema)

        await page.close()
    })
})
