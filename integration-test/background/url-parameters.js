const harness = require('../helpers/harness')
const { loadTestConfig, unloadTestConfig } = require('../helpers/testConfig')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')

const testSite = 'https://privacy-test-pages.glitch.me/privacy-protections/query-parameters/'

/**
 * Returns the value of the `urlParametersRemoved` breakage flag for the current
 * active tab. The flag is true/false, but null indicates failure.
 * @param {Page} bgPage
 *   The background extension page.
 * @returns {boolean|null}
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

        const tab = window.dbg.tabManager.get({ tabId })
        return tab ? tab.urlParametersRemoved : null
    })
}

describe('Test URL tracking parameters protection', () => {
    let browser
    let bgPage
    let teardown

    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)

        // Overwrite the parts of the configuration needed for our tests.
        await loadTestConfig(bgPage, 'url-parameters.json')
    })

    afterAll(async () => {
        // Restore the original configuration.
        await unloadTestConfig(bgPage)

        try {
            await teardown()
        } catch (e) {}
    })

    it('Strips tracking parameters correctly', async () => {
        // Load the test page.
        const page = await browser.newPage()
        await pageWait.forGoto(page, testSite)

        // Check that the `urlParametersRemoved` breakage flag isn't set.
        expect(await getUrlParametersRemoved(bgPage)).toEqual(false)

        // Scrape the list of test cases.
        const testCases = []
        for (const li of await page.$$('li')) {
            testCases.push(await page.evaluate(li => {
                const { innerText: description, href: initialUrl } = li.querySelector('a')
                let { innerText: expectedSearch } = li.querySelector('.expected')

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
            await pageWait.forGoto(page, initialUrl)
            expect(page.url()).withContext(description).toEqual(expectedUrl)

            // Test the `urlParametersRemoved` breakage flag was set correctly.
            // Note: `null` denotes tab not found.
            expect(await getUrlParametersRemoved(bgPage))
                .withContext(description + ' (urlParametersRemoved)')
                .toEqual(expectedUrl.length < initialUrl.length)

            // Reload the page, to check that `urlParametersRemoved` was cleared.
            await pageWait.forReload(page)
            expect(await getUrlParametersRemoved(bgPage)).toEqual(false)
        }
    })
})
