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
        await logPageRequests(
            page,
            pageRequests,
            ({ url }) => url.hostname === 'bad.third-party.site'
        )

        // Initiate the test requests and wait until they have all completed.
        // Note:
        //  - Waiting for network idle here does not work for some reason.
        //  - ServiceWorker + WebWorker initiated requests are not yet logged by
        //    logPageRequests.
        await page.click('#start')
        const testCount = await page.evaluate(
            // eslint-disable-next-line no-undef
            () => tests.filter(({ id }) => !id.includes('worker')).length
        )
        while (pageRequests.length < testCount) {
            await backgroundWait.forTimeout(bgPage, 100)
        }

        // Verify that no logged requests were allowed.
        for (const { url, method, type, status } of pageRequests) {
            const description = `URL: ${url}, Method: ${method}, Type: ${type}`
            expect(status).withContext(description).toEqual('blocked')
        }

        // Wait an additional second to ensure that the WebWorker +
        // ServiceWorker initiated requests have finished. This can be removed
        // once logPageRequests can intercept those requests.
        await backgroundWait.forTimeout(bgPage, 1000)

        // Also check that the test page itself agrees that no requests were
        // allowed.
        const pageResults = await page.evaluate(
            () => results.results // eslint-disable-line no-undef
        )
        for (const { id, category, status } of pageResults) {
            // ServiceWorker initiated request blocking is not yet supported.
            if (id === 'serviceworker-fetch') {
                continue
            }

            const description = `ID: ${id}, Category: ${category}`
            expect(status).withContext(description).not.toEqual('loaded')
        }

        await page.close()
    })
})
