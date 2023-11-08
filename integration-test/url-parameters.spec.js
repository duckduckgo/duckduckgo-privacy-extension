import { test, expect } from './helpers/playwrightHarness'
import backgroundWait from './helpers/backgroundWait'
import { routeFromLocalhost } from './helpers/testPages'
import { overridePrivacyConfig } from './helpers/testConfig'

const testSite = 'https://privacy-test-pages.site/privacy-protections/query-parameters/'

/**
 * Returns the value of the `urlParametersRemoved` breakage flag for the current
 * active tab. The flag is true/false, but null indicates failure.
 * @param {Page} bgPage
 *   The background extension page.
 * @returns {Promise<boolean|null>}
 *   The value of `urlParametersRemoved` for the currently active tab, or null
 *   on failure.
 */
function getUrlParametersRemoved (bgPage) {
    return bgPage.evaluate(async () => {
        const [{ id: tabId }] = await new Promise(resolve => {
            chrome.tabs.query(
                { active: true, currentWindow: true },
                resolve
            )
        })

        if (typeof tabId !== 'number') {
            return null
        }

        const tab = globalThis.dbg.tabManager.get({ tabId })
        return tab ? tab.urlParametersRemoved : null
    })
}

test.describe('Test URL tracking parameters protection', () => {
    test('Strips tracking parameters correctly', async ({ context, backgroundPage, page, manifestVersion, backgroundNetworkContext }) => {
        await overridePrivacyConfig(backgroundNetworkContext, 'url-parameters.json')
        await backgroundWait.forExtensionLoaded(context)
        await backgroundWait.forAllConfiguration(backgroundPage)
        await routeFromLocalhost(page)

        await page.goto(testSite, { waitUntil: 'networkidle' })
        await page.bringToFront()

        // Check that the `urlParametersRemoved` breakage flag isn't set.
        expect(await getUrlParametersRemoved(backgroundPage)).toEqual(false)

        // Scrape the list of test cases.
        const testCases = []
        for (const li of await page.$$('li')) {
            testCases.push(await page.evaluate(liInstance => {
                const { innerText: description, href: initialUrl } = liInstance.querySelector('a')
                let { innerText: expectedSearch } = liInstance.querySelector('.expected')

                // Strip the 'Expected: "..."' wrapper if it exists.
                const match = /"([^"]*)"/.exec(expectedSearch)
                if (match) {
                    expectedSearch = match[1]
                }

                let expectedUrl = new URL(initialUrl)
                expectedUrl.search = expectedSearch
                expectedUrl = expectedUrl.href

                return { initialUrl, expectedUrl, description }
            }, li))
        }

        // Perform the tests.
        for (const { initialUrl, expectedUrl, description } of testCases) {
            // Test the tracking parameters were stripped.
            await page.goto(initialUrl)
            let actualUrl = page.url()
            if (actualUrl.endsWith('?')) {
                // Query transform declarativeNetRequest rules do not strip the
                // trailing `?` when removing the last parameter from a URL.
                actualUrl = actualUrl.substr(0, actualUrl.length - 1)
            }
            expect(actualUrl, description).toEqual(expectedUrl)

            // Test the `urlParametersRemoved` breakage flag was set correctly.
            // Notes:
            //  - `null` denotes tab not found.
            //  - This is not supported with Chrome MV3.
            if (manifestVersion === 2) {
                expect(await getUrlParametersRemoved(backgroundPage), description + ' (urlParametersRemoved)')
                    .toEqual(expectedUrl.length < initialUrl.length)
            }

            // Reload the page, to check that `urlParametersRemoved` was cleared.
            await page.reload({ waitUntil: 'networkidle' })
            expect(await getUrlParametersRemoved(backgroundPage)).toEqual(false)
        }
    })
})
