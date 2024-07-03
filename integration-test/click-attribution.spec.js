import { test, expect } from './helpers/playwrightHarness'
import backgroundWait from './helpers/backgroundWait'
import { logPixels } from './helpers/pixels'
import testCases from 'privacy-test-pages/adClickFlow/shared/testCases.json'
import { expectedPixels } from './data/click-attribution-pixels'

if (testCases.length === 0) {
    throw new Error('No test cases found')
}

// Populate the expected pixels for each test case.
// TODO: Remove this once expected pixels are included in testCases.json.
for (let i = 0; i < testCases.length; i++) {
    let j = 0
    for (; j < testCases[i].steps.length; j++) {
        testCases[i].steps[j].expected.pixels = expectedPixels?.[i]?.[j + 1] || []
    }

    testCases[i].steps[j - 1].final = true
}

test.describe('Ad click blocking', () => {
    const backgroundPixels = []
    let clearBackgroundPixels

    test.beforeEach(async ({ context, backgroundNetworkContext }) => {
        if (clearBackgroundPixels) {
            clearBackgroundPixels()
        }
        clearBackgroundPixels = await logPixels(
            backgroundNetworkContext,
            backgroundPixels,
            ({ name }) => name !== 'page_extensionsuccess_impression'
        )

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
        itMethod(testCase.name, async ({ context, backgroundPage }) => {
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

                if (step.final) {
                    // Simulate 24 hours having passed, when the final pixel should fire.
                    await backgroundPage.evaluate(
                        () => globalThis.dbg.sendPageloadsWithAdAttributionPixelAndResetCount()
                    )
                }

                expect(backgroundPixels.length, `${step.name} expects the right number of pixels to fire`)
                    .toEqual(step.expected.pixels.length)
                for (let i = 0; i < step.expected.pixels.length; i++) {
                    expect(backgroundPixels[i], `${step.name} expects pixel "${step.expected.pixels[i].name}" to have fired correctly.`)
                        .toEqual(step.expected.pixels[i])
                }
                clearBackgroundPixels()
            }
            await page.close()
        })
    }
})
