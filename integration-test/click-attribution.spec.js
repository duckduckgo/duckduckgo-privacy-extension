import { test, expect } from './helpers/playwrightHarness'
import backgroundWait from './helpers/backgroundWait'
import testCases from 'privacy-test-pages/adClickFlow/shared/testCases.json'
import { routeFromLocalhost } from './helpers/testPages'

if (testCases.length === 0) {
    throw new Error('No test cases found')
}

test.describe('Ad click blocking', () => {
    test.beforeEach(async ({ context }) => {
        await backgroundWait.forExtensionLoaded(context)
    })

    /**
     * Clicks on an item and awaits a navigation to load.
     * @param {*} page
     * @param {string} selector
     * @returns {Promise<*>}
     */
    function clickAndNavigate (page, selector) {
        return Promise.all([
            page.waitForNavigation(),
            page.click(selector)
        ])
    }

    /**
     * Clicks on an item and awaits a new tab to load.
     * @param {import('@playwright/test').Page}} existingPage
     * @param {string} selector
     * @returns {Promise<*>}
     */
    async function clickAndNewTab (existingPage, selector, options, expectedURL) {
        const newTarget = new Promise((resolve) => {
            existingPage.context().once('page', (page) => {
                resolve(page)
            })
        })
        existingPage.click(selector, options)
        const page = await newTarget
        await page.bringToFront()
        const checkPageNavigatedProperly = await page.waitForFunction(() => {
            return window.location.href !== 'about:blank' && document.readyState === 'complete'
        })
        expect(checkPageNavigatedProperly, 'clickAndNewTab to load a non about:blank page').toBeTruthy()
        return page
    }

    for (const testCase of testCases) {
        // Allow to filter to one test case
        const itMethod = testCase.only ? test.only : test
        itMethod(testCase.name, async ({ context }) => {
            // route requests from all pages in this test to our local test server
            await routeFromLocalhost(context)
            let page = await context.newPage()
            for (const step of testCase.steps) {
                if (step.action.type === 'navigate') {
                    await page.goto(step.action.url, { waitUntil: 'networkidle' })
                } else if (step.action.type === 'click' || step.action.type === 'click-new-tab') {
                    const clickSelector = `#${step.action.id}`
                    const newTab = !!step.expected.newTab
                    const options = {}
                    if (step.action.type === 'click-new-tab') {
                        options.button = 'middle'
                    }
                    if (newTab) {
                        const newPage = await clickAndNewTab(page, clickSelector, options, step.expected.url)
                        page.close()
                        page = newPage
                    } else {
                        await clickAndNavigate(page, clickSelector)
                    }
                }
                expect(page.url(), `${step.name} expects ${step.expected.url}`)
                    .toBe(step.expected.url)

                if (step.expected.requests) {
                    const resources = await page.evaluate(() => globalThis.resources)
                    expect(resources.length).toBe(step.expected.requests.length)
                    for (const request of step.expected.requests) {
                        const expectedResource = resources.find(resource => resource.url === request.url)
                        expect(expectedResource, `${step.name} expects ${request.url} to have be detected in the page`)
                            .toBeDefined()
                        expect(expectedResource.status, `${step.name} expects ${request.url} to be '${request.status}'`)
                            .toBe(request.status)
                    }
                }
            }
            await page.close()
        })
    }
})
