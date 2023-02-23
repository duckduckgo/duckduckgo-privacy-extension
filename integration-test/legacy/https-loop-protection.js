/**
 *  Tests for https upgrading to prevent infinate loops
 */

const harness = require('../helpers/harness')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')

let browser
let bgPage
let teardown

describe('Loop protection', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)
    })
    afterAll(async () => {
        await teardown()
    })

    it('Loop protection page should prevent loading https:// inifinately', async () => {
        const loopProtectionPage = 'https://good.third-party.site/privacy-protections/https-loop-protection/'
        const page = await browser.newPage()

        await pageWait.forGoto(page, loopProtectionPage)
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
