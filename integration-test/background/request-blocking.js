const harness = require('../helpers/harness')
const { logPageRequests } = require('../helpers/requests')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')

const testSite = 'https://privacy-test-pages.glitch.me/privacy-protections/request-blocking/'

let browser
let bgPage
let teardown

describe('Test request blocking', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)
    })

    afterAll(async () => {
        await teardown()
    })

    it('Should block all the test tracking requests', async () => {
        // Load the test page.
        const page = await browser.newPage()
        await pageWait.forGoto(page, testSite)

        // Start logging network requests.
        const pageRequests = []
        logPageRequests(page, pageRequests)

        // Initiate the test requests and wait until they have all completed.
        // Note: Waiting for network idle here does not work for some reason.
        await page.click('#start')
        await page.waitForFunction(
            // eslint-disable-next-line no-undef
            () => results.results.length >= tests.length
        )

        // Verify that no requests were allowed.
        for (const { url, method, type, status } of pageRequests) {
            const { hostname } = new URL(url)
            if (hostname !== 'bad.third-party.site') {
                continue
            }
            const description = `URL: ${url}, Method: ${method}, Type: ${type}`
            expect(status).withContext(description).toEqual('blocked')
        }

        // Also check that the test page itself agrees that no requests were
        // allowed.
        const pageResults = await page.evaluate(
            () => results.results // eslint-disable-line no-undef
        )
        for (const { id, category, status } of pageResults) {
            const description = `ID: ${id}, Category: ${category}`
            expect(status).withContext(description).not.toEqual('loaded')
        }

        await page.close()
    })
})
