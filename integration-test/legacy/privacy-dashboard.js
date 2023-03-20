const harness = require('../helpers/harness')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')
const { loadTestConfig } = require('../helpers/testConfig')

const testSite = 'https://privacy-test-pages.glitch.me/privacy-protections/request-blocking/'

let browser
let bgPage
let teardown

describe('Test privacy dashboard', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)
        await loadTestConfig(bgPage, 'serviceworker-blocking.json')
    })

    afterAll(async () => {
        await teardown()
    })

    it('Should load the dashboard with correct link text', async () => {
        // Load the test page.
        const page = await browser.newPage()
        await pageWait.forGoto(page, testSite)

        await page.click('#start')

        const panelUrl = await bgPage.evaluate(async () => {
            const currentTab = await globalThis.dbg.utils.getCurrentTab()
            return chrome.runtime.getURL(`dashboard/html/browser.html?tabId=${currentTab.id}`)
        })

        const panel = await browser.newPage()
        await panel.goto(panelUrl)
        await panel.bringToFront()

        const links = await linksText(panel)
        expect(links).toEqual([
            'Connection Is Encrypted',
            'Requests Blocked from Loading',
            'No Third-Party Requests Found'
        ])
    })
})

async function linksText (panel) {
    // the list of CSS selectors for the main-nav links
    const links = [
        '[aria-label="View Connection Information"]',
        '[aria-label="View Tracker Companies"]',
        '[aria-label="View Non-Tracker Companies"]'
    ]

    // create 1 combined css selector for all elements
    const cssSelector = links.join(',')

    // we don't want to make any assertions until the elements are rendered
    await panel.waitForFunction((selector) => document.querySelectorAll(selector).length === 3, {}, cssSelector)

    // now we can read the text-content of each element
    return panel.evaluate(selector => {
        const elements = Array.from(document.querySelectorAll(selector))
        return elements.map(li => {
            return li.textContent.trim()
        })
    }, cssSelector)
}
