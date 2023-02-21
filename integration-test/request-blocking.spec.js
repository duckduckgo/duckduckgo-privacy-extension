import { test, expect } from './helpers/playwrightHarness'
import { forAllConfiguration, forExtensionLoaded } from './helpers/backgroundWait'

const testHost = 'privacy-test-pages.glitch.me'
const testSite = `https://${testHost}/privacy-protections/request-blocking/`

async function runRequestBlockingTest (page) {
    const pageRequests = []
    page.on('request', async (req) => {
        if (!req.url().startsWith('https://bad.third-party.site/')) {
            return
        }
        let status = 'unknown'
        const resp = await req.response()
        if (!resp) {
            status = 'blocked'
        } else {
            status = resp.ok ? 'allowed' : 'redirected'
        }
        pageRequests.push({
            url: req.url(),
            mathod: req.method(),
            type: req.resourceType(),
            status
        })
    })

    await page.bringToFront()
    await page.goto(testSite, { waitUntil: 'networkidle' })
    await page.click('#start')
    const testCount = await page.evaluate(
        // eslint-disable-next-line no-undef
        () => tests.filter(({ id }) => !id.includes('worker')).length
    )
    while (pageRequests.length < testCount) {
        await page.waitForTimeout(100)
    }
    await page.waitForTimeout(1000)

    return [testCount, pageRequests]
}

test.describe('Test request blocking', () => {
    test('Should block all the test tracking requests', async ({ page, backgroundPage, context }) => {
        await forExtensionLoaded(context)
        await forAllConfiguration(backgroundPage)
        const [testCount, pageRequests] = await runRequestBlockingTest(page)

        // Verify that no logged requests were allowed.
        for (const { url, method, type, status } of pageRequests) {
            const description = `URL: ${url}, Method: ${method}, Type: ${type}`
            expect(status, description).toEqual('blocked')
        }

        // Also check that the test page itself agrees that no requests were
        // allowed.
        const pageResults = await page.evaluate(
            () => results.results // eslint-disable-line no-undef
        )
        for (const { id, category, status } of pageResults) {
            const description = `ID: ${id}, Category: ${category}`
            expect(status, description).not.toEqual('loaded')
        }

        // Test the extension's tracker reporting matches the expected outcomes.
        const extensionTrackers = await backgroundPage.evaluate(async () => {
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

    test('serviceworkerInitiatedRequests exceptions should disable service worker blocking', async ({ page, backgroundPage, context }) => {
        await forExtensionLoaded(context)
        await forAllConfiguration(backgroundPage)
        await backgroundPage.evaluate(async (domain) => {
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
            expect(status, description).toEqual('blocked')
        }

        // Check that the test page itself agrees that no requests were
        // allowed.
        const pageResults = await page.evaluate(
            () => results.results // eslint-disable-line no-undef
        )
        for (const { id, category, status } of pageResults) {
            const description = `ID: ${id}, Category: ${category}`
            if (id === 'serviceworker-fetch') {
                expect(status, description).toEqual('loaded')
            } else {
                expect(status, description).not.toEqual('loaded')
            }
        }
    })
})
