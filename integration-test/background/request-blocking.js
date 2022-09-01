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
        const manifestVersion = await bgPage.evaluate(() => {
            return globalThis.dbg.browserWrapper.getManifestVersion()
        })

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

        // Test the tracker reporting matches the expected outcomes.
        const trackers = await bgPage.evaluate(async () => {
            const currentTab = await globalThis.dbg.utils.getCurrentTab()
            return globalThis.dbg.tabManager.get({ tabId: currentTab.id }).trackers
        })
        // TODO fix manifest v3 blocking service workers (https://app.asana.com/0/1200940319964997/1202895557146471/f)
        // The count is higher for MV2 as we permit a load that loads more requests.
        const count = manifestVersion === 2 ? 20 : 19

        // Test the tabs tracker objects match the expected snapshot.
        const trackerSnapshot = {
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
                count
            }
        }
        expect(trackers).toEqual(trackerSnapshot)

        await page.close()
    })
})
