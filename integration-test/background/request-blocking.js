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
            const description = `ID: ${id}, Category: ${category}`

            // ServiceWorker initiated request blocking is not yet supported.
            // TODO: Remove this condition once they are blocked again.
            if (id === 'serviceworker-fetch') {
                expect(status).withContext(description).toEqual('loaded')
                continue
            }

            expect(status).withContext(description).not.toEqual('loaded')
        }

        // Test the extension's tracker reporting matches the expected outcomes.
        const extensionTrackers = await bgPage.evaluate(async () => {
            const currentTab = await globalThis.dbg.utils.getCurrentTab()
            return globalThis.dbg.tabManager.get({ tabId: currentTab.id }).trackers
        })

        const extensionTrackersCount =
              extensionTrackers['Test Site for Tracker Blocking'].count
        expect(extensionTrackersCount).toBeGreaterThanOrEqual(testCount)

        expect(extensionTrackers).toEqual({
            'Test Site for Tracker Blocking': {
                displayName: 'Bad Third Party Site',
                prevalence: 0.1,
                urls: {
                    'bad.third-party.site': {
                        block: {
                            action: 'block',
                            reason: 'default block',
                            categories: [],
                            isBlocked: true,
                            isSameEntity: false,
                            isSameBaseDomain: false
                        }
                    }
                },
                count: extensionTrackersCount
            }
        })

        await page.close()
    })
})
