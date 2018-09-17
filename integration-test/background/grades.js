/* global dbg:false */
const harness = require('../helpers/harness')

const tests = [
    { url: 'duckduckgo.com', siteGrade: 'A', enhancedGrade: 'A' },
    { url: 'theguardian.com', siteGrade: 'D-', enhancedGrade: 'B+' },
    { url: 'google.com', siteGrade: 'D', enhancedGrade: 'D' }
]

let browser
let bgPage

// getting HTTPS can take a while
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000

const getGradeByUrl = (url) => {
    const tabsById = dbg.tabManager.tabContainer
    let tab

    Object.keys(tabsById).some((id) => {
        let t = tabsById[id]

        if (t.url.indexOf(url) > -1) {
            tab = tabsById[id]
            return true
        }
    })

    return tab.site.grade.get()
}

describe('grade sanity checks', () => {
    beforeAll(async () => {
        ({ browser, bgPage } = await harness.setup())

        // wait for HTTPs to successfully load
        await bgPage.waitForFunction(
            () => window.dbg && dbg.https.isReady,
            { polling: 100, timeout: 60000 }
        )
    })
    afterAll(async () => {
        await harness.teardown(browser)
    })

    tests.forEach(test => {
        it(`${test.url} should be graded as a ${test.siteGrade} -> ${test.enhancedGrade}`, async () => {
            const page = await browser.newPage()
            const ua = await browser.userAgent()
            await page.setUserAgent(ua.replace(/Headless /, ''))

            try {
                await page.goto(`http://${test.url}`, { waitUntil: 'networkidle2' })
            } catch (e) {
                // timed out waiting for page to load, let's try running the test anyway
            }
            // give it another second just to be sure
            await page.waitFor(1000)

            const grades = await bgPage.evaluate(getGradeByUrl, test.url)

            expect(grades.site.grade).toEqual(test.siteGrade)
            expect(grades.enhanced.grade).toEqual(test.enhancedGrade)

            await page.close()
        })
    })
})
