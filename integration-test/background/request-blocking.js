const harness = require('../helpers/harness')
const { logPageRequests } = require('../helpers/requests')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')
const { loadTestConfig } = require('../helpers/testConfig')

const testHost = 'privacy-test-pages.glitch.me'
const testSite = `https://${testHost}/privacy-protections/request-blocking/`

let browser
let bgPage
let teardown

async function runRequestBlockingTest (page) {
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

    // Wait an additional second to ensure that the WebWorker +
    // ServiceWorker initiated requests have finished. This can be removed
    // once logPageRequests can intercept those requests.
    await backgroundWait.forTimeout(bgPage, 1000)

    return [testCount, pageRequests]
}

describe('Test request blocking', () => {
    beforeEach(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)
        await loadTestConfig(bgPage, 'serviceworker-blocking.json')
    })

    afterEach(async () => {
        await teardown()
    })

    it('Should block all the test tracking requests', async () => {
        // Load the test page.
        const page = await browser.newPage()
        const [testCount, pageRequests] = await runRequestBlockingTest(page)

        // Verify that no logged requests were allowed.
        for (const { url, method, type, status } of pageRequests) {
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
                    'bad.third-party.site:block': {
                        action: 'block',
                        url: 'https://bad.third-party.site/privacy-protections/request-blocking/block-me/script.js',
                        eTLDplus1: 'third-party.site',
                        pageUrl: 'https://privacy-test-pages.glitch.me/privacy-protections/request-blocking/',
                        entityName: 'Bad Third Party Site',
                        prevalence: 0.1,
                        state: { blocked: {} }
                    }
                },
                count: extensionTrackersCount
            }
        })

        await page.close()
    })

    it('serviceworkerInitiatedRequests exceptions should disable service worker blocking', async () => {
        const page = await browser.newPage()
        await bgPage.evaluate(async (domain) => {
            /* global dbg */
            const { data: config } = dbg.getListContents('config')
            config.features.serviceworkerInitiatedRequests.exceptions.push({
                domain,
                reason: 'test'
            })
            await dbg.setListContents({
                name: 'config',
                value: config
            })
        }, testHost)
        const [, pageRequests] = await runRequestBlockingTest(page)

        // Verify that no logged requests were allowed.
        for (const { url, method, type, status } of pageRequests) {
            const description = `URL: ${url}, Method: ${method}, Type: ${type}`
            expect(status).withContext(description).toEqual('blocked')
        }

        // Check that the test page itself agrees that no requests were
        // allowed.
        const pageResults = await page.evaluate(
            () => results.results // eslint-disable-line no-undef
        )
        for (const { id, category, status } of pageResults) {
            const description = `ID: ${id}, Category: ${category}`
            if (id === 'serviceworker-fetch') {
                expect(status).withContext(description).toEqual('loaded')
            } else {
                expect(status).withContext(description).not.toEqual('loaded')
            }
        }
    })
})
