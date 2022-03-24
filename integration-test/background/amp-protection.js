const harness = require('../helpers/harness')
const { loadTestConfig, unloadTestConfig } = require('../helpers/testConfig')
const backgroundWait = require('../helpers/backgroundWait')

const testSite = 'https://privacy-test-pages.glitch.me/privacy-protections/amp/'

/**
 * Returns the value of the `ampUrl` breakage flag for the current
 * active tab. The flag conatins the original AMP url or null.
 * @param {Page} bgPage
 *   The background extension page.
 * @returns {boolean|null}
 *   The value of `ampUrl` for the currently active tab, or null
 *   if AMP protections haven't fired
 */
function getAmpUrl(bgPage) {
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
        return tab ? tab.ampUrl : null
    })
}

describe('Test AMP URL tracking protection', () => {
    let browser
    let bgPage
    let teardown

    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)

        // Overwrite the parts of the configuration needed for our tests.
        await loadTestConfig(bgPage, 'amp-protections.json')
    })

    afterAll(async () => {
        // Restore the original configuration.
        await unloadTestConfig(bgPage)

        try {
            await teardown()
        } catch (e) { }
    })

    it('Rewrite AMP URL correctly', async () => {
        // Load the test page.
        const page = await browser.newPage()
        await page.goto(testSite, { waitUntil: 'networkidle0' })

        if (page.url() === 'about:blank') {
            await page.waitForNavigation()
        }

        // Check that the `ampUrl` breakage flag isn't set.
        expect(await getAmpUrl(bgPage)).toEqual(testSite)

        // Scrape the list of test cases.
        let testCases = []
        for (const li of await page.$$('li')) {
            testCases.push(await page.evaluate(li => {
                const { innerText: description, href: initialUrl } = li.querySelector('a')
                let { innerText: expectedUrlStr } = li.querySelector('.expected')

                const expectedUrl = new URL(expectedUrlStr.split(' ')[1]).href

                return { initialUrl, expectedUrl, description }
            }, li))
        }

        const exceptions = [
            'www.brookings.edu', // page takes too long to load in tests
            'www.wpxi.com', // parameters are re-computed when loaded
            'amp.dev', // url changed
            'www.vox.com' // url changed
        ]

        // remove exceptions from test cases
        testCases = testCases.filter(({ expectedUrl }) => !exceptions.includes(new URL(expectedUrl).hostname) )

        // Perform the tests.
        for (const { initialUrl, expectedUrl, description } of testCases) {
            // Load the amp url
            await page.goto(initialUrl, { waitUntil: 'networkidle0' })

            if (page.url() === 'about:blank') {
                await page.waitForNavigation()
            }

            expect(page.url()).withContext(description).toEqual(expectedUrl)

            // Test the `ampUrl` breakage flag was set correctly.
            expect(await getAmpUrl(bgPage))
                .withContext(description + ' (ampUrl)')
                .toEqual(initialUrl)

            // Navigate back to the test page and check that the `ampUrl` is null.
            await page.goto('https://example.com', { waitUntil: 'networkidle0' })
            expect(await getAmpUrl(bgPage)).toEqual(null)
        }
    })
})
