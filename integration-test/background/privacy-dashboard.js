const harness = require('../helpers/harness')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')

const testSite = 'https://privacy-test-pages.glitch.me/privacy-protections/request-blocking/'

let browser
let bgPage
let teardown

describe('Test privacy dashboard', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)
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
            return chrome.runtime.getURL(`dashboard/html/popup.html?tabId=${currentTab.id}`)
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

function linksText (panel) {
    return panel.evaluate(() => {
        const linkTexts = []
        document.querySelectorAll('[data-test-id="list-links"] li').forEach(li => {
            linkTexts.push(li.textContent.trim())
        })
        return linkTexts
    })
}
