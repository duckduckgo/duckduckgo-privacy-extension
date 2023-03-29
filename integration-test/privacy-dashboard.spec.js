import { test, expect } from './helpers/playwrightHarness'
import backgroundWait from './helpers/backgroundWait'
import { routeFromLocalhost } from './helpers/testPages'
import { loadTestConfig } from './helpers/testConfig'

const testSite = 'https://privacy-test-pages.glitch.me/privacy-protections/request-blocking/'

test.describe('Test privacy dashboard', () => {
    test('Should load the dashboard with correct link text', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context)
        await backgroundWait.forAllConfiguration(backgroundPage)
        await loadTestConfig(backgroundPage, 'serviceworker-blocking.json')
        await routeFromLocalhost(page)

        await page.goto(testSite, { waitUntil: 'networkidle' })
        await page.bringToFront()
        await page.click('#start')

        const panelUrl = await backgroundPage.evaluate(async () => {
            const currentTab = await globalThis.dbg.utils.getCurrentTab()
            return chrome.runtime.getURL(`dashboard/html/browser.html?tabId=${currentTab.id}`)
        })

        const panel = await context.newPage()
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
    await panel.waitForFunction((selector) => document.querySelectorAll(selector).length === 3, cssSelector)

    // now we can read the text-content of each element
    return panel.evaluate(selector => {
        const elements = Array.from(document.querySelectorAll(selector))
        return elements.map(li => {
            return li.textContent.trim()
        })
    }, cssSelector)
}
