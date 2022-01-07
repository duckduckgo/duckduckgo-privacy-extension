/**
 *  Tests for https upgrading to prevent infinate loops
 */

/* global dbg:false */
const harness = require('../helpers/harness')

let browser
let bgPage
let teardown

describe('Loop protection', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())

        // wait for HTTPs to successfully load
        await bgPage.waitForFunction(
            () => window.dbg && dbg.https.isReady,
            { polling: 100, timeout: 60000 }
        )
    })
    afterAll(async () => {
        await teardown()
    })

    it('Loop protection page should prevent loading https:// inifinately', async () => {
        const loopProtectionPage = 'https://good.third-party.site/privacy-protections/https-loop-protection/'
        const page = await browser.newPage()

        try {
            await page.goto(loopProtectionPage, { waitUntil: 'networkidle0' })
        } catch (e) {
            // timed out waiting for page to load, let's try running the test anyway
        }
        await page.click('#start')
        await page.waitForFunction(
            () => results.date !== null && results.results[0].value !== null,
            { polling: 100, timeout: 60000 }
        )
        const results = await page.evaluate(() => {
            return results
        })

        // The expected outcome of this test is we land back on http:// rather than upgrading forever to https://
        const expectedValue = 'http://good.third-party.site/privacy-protections/https-loop-protection/http-only.html'
        expect(results.results[0].value).toEqual(expectedValue)

        await page.close()
    })
})
