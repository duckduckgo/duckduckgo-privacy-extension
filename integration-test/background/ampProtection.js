const puppeteer = require('puppeteer')
const harness = require('../helpers/harness')
const { loadTestConfig, unloadTestConfig } = require('../helpers/testConfig')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')

const testSite = 'https://privacy-test-pages.glitch.me/privacy-protections/amp/'

describe('Test AMP link protection', () => {
    let browser
    let bgPage
    let teardown

    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)

        // Overwrite the parts of the configuration needed for our tests.
        await loadTestConfig(bgPage, 'amp-protection.json')
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

        // Scrape the list of test cases.
        const testCases = []

        const testGroups = await page.$$('#demo ul')
        const testGroupTitles = await page.$$('#demo > p')
        for (let i = 0; i < testGroups.length; i++) {
            const groupTitle =
                  await page.evaluate(el => el.innerText, testGroupTitles[i])

            // "Deep link extraction" is not yet supported.
            if (groupTitle === 'First Party Cloaked AMP links') {
                continue
            }

            for (const li of await testGroups[i].$$('li')) {
                // eslint-disable-next-line no-shadow
                testCases.push(await page.evaluate((li, groupTitle) => {
                    const {
                        innerText: testTitle,
                        href: initialUrl
                    } = li.querySelector('a')
                    const description = groupTitle + ': ' + testTitle

                    let {
                        innerText: expectedUrl
                    } = li.querySelector('.expected')
                    // Strip the 'Expected: ' prefix and normalise the URL.
                    expectedUrl = expectedUrl.split(' ')[1]

                    return { initialUrl, expectedUrl, description }
                }, li, groupTitle))
            }
        }

        // Perform the tests.
        for (const { initialUrl, expectedUrl, description } of testCases) {
            // Test the URL was redirected.
            // Note: It would be preferable to use pageWait.forGoto() here
            //       instead, but some of the test cases are very slow to load.
            //       Since only the redirected main_frame URL is required for
            //       these tests, just wait for load rather than network idle.
            try {
                await await page.goto(
                    initialUrl, { waitUntil: 'load', timeout: 15000 }
                )
            } catch (e) {
                if (e instanceof puppeteer.errors.TimeoutError) {
                    pending('Timed out loading URL: ' + initialUrl)
                } else {
                    throw e
                }
            }

            expect(await page.url()).withContext(description).toEqual(expectedUrl)
        }
    })
})
