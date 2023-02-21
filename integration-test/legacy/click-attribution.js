const harness = require('../helpers/harness')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')

let browser
let bgPage
let teardown
const testCases = require('../artifacts/attribution.json')

describe('Ad click blocking', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)
    })

    afterAll(async () => {
        try {
            await teardown()
        } catch (e) {}
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
     * @param {Puppeteer.page} page
     * @param {string} variableName
     * @returns {Promise<*>}
     */
    async function waitForVariable (page, variableName) {
        const callback = (variableNameInstance) => globalThis[variableNameInstance]
        await expectAsync(page.waitForFunction(callback, { timeout: 2000 }, variableName))
            .withContext(`waitForVariable for '${variableName}'`)
            .not.toBeRejected()
        return page.evaluate(callback, variableName)
    }

    /**
     * Clicks on an item and awaits a new tab to load.
     * https://github.com/puppeteer/puppeteer/issues/3667 without this intercepting new tab requests is too late
     * @param {Puppeteer.page} existingPage
     * @param {string} selector
     * @returns {Promise<*>}
     */
    async function clickAndNewTab (existingPage, selector, options, expectedURL) {
        const [newTarget] = await Promise.all([
            browser.waitForTarget(target => {
                if (expectedURL && target.url() === expectedURL) {
                    return true
                }
                // Opener isn't always set for new tabs.
                return target.opener() === existingPage.target()
            }),
            existingPage.click(selector, options)
        ])
        const page = await newTarget.page()
        await page.bringToFront()
        await expectAsync(page.waitForFunction(() => {
            return window.location.href !== 'about:blank' && document.readyState === 'complete'
        })).withContext('clickAndNewTab to load a non about:blank page').not.toBeRejected()
        return page
    }

    for (const test of testCases) {
        // Allow to filter to one test case
        const itMethod = test.only ? fit : it
        itMethod(test.name, async () => {
            let page = await browser.newPage()
            for (const step of test.steps) {
                if (step.action.type === 'navigate') {
                    await pageWait.forGoto(page, step.action.url)
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
                expect(page.url())
                    .withContext(`${step.name} expects ${step.expected.url}`)
                    .toBe(step.expected.url)

                if (step.expected.requests) {
                    const resources = await waitForVariable(page, 'resources')
                    expect(resources.length).toBe(step.expected.requests.length)
                    for (const request of step.expected.requests) {
                        const expectedResource = resources.find(resource => resource.url === request.url)
                        expect(expectedResource)
                            .withContext(`${step.name} expects ${request.url} to have be detected in the page`)
                            .toBeDefined()
                        expect(expectedResource.status)
                            .withContext(`${step.name} expects ${request.url} to be '${request.status}'`)
                            .toBe(request.status)
                    }
                }
            }
            await page.close()
        })
    }
})
