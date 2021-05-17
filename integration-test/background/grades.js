/* global dbg:false */
const harness = require('../helpers/harness')

const tests = [
    { url: 'duckduckgo.com', siteGrade: 'A', enhancedGrade: 'A' },
    { url: 'www.independent.co.uk', siteGrade: ['D', 'D-'], enhancedGrade: 'B+' },
    { url: 'google.com', siteGrade: 'D', enhancedGrade: 'D' },
    { url: 'reddit.com', siteGrade: ['D', 'D-', 'C'], enhancedGrade: 'B' },
    { url: 'facebook.com', siteGrade: ['D', 'C+'], enhancedGrade: 'C+' },
    { url: 'twitter.com', siteGrade: 'C', enhancedGrade: 'B' },
    { url: 'en.wikipedia.org', siteGrade: 'B+', enhancedGrade: 'B+' }
]

let browser
let bgPage

// getting HTTPS can take a while
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000

const getGradeByUrl = (url) => {
    const tabsById = dbg.tabManager.tabContainer
    let tab

    Object.keys(tabsById).some((id) => {
        const t = tabsById[id]

        if (t.url.indexOf(url) > -1) {
            tab = tabsById[id]
            return true
        }
        return false
    })

    return tab.site.grade.get()
}

// allow a flexible range defined via an array,
// e.g. if the site serves a variable number of trackers
const checkGrade = (result, expected) => {
    if (expected instanceof Array) {
        expect(expected).toContain(result)
    } else {
        expect(result).toEqual(expected)
    }
}

describe('grade sanity checks', () => {
    beforeAll(async () => {
        ({ browser, bgPage } = await harness.setup())

        // wait for HTTPs to successfully load
        await bgPage.waitForFunction(
            () => window.dbg && dbg.https.isReady,
            { polling: 100, timeout: 20000 }
        )
    })
    afterAll(async () => {
        try {
            await harness.teardown(browser)
        } catch (e) {}
    })

    tests.forEach(test => {
        it(`${test.url} should be graded as a ${test.siteGrade} -> ${test.enhancedGrade}`, async () => {
            const page = await browser.newPage()
            const ua = await browser.userAgent()
            await page.setUserAgent(ua.replace(/Headless /, ''))

            try {
                await page.goto(`http://${test.url}`, { waitUntil: 'networkidle0' })
                // give it another second just to be sure
                await page.waitForTimeout(1000)
            } catch (e) {
                // timed out waiting for page to load, let's try running the test anyway
                console.log(`Timed out: ${e}`)
            }

            const grades = await bgPage.evaluate(getGradeByUrl, test.url)
            checkGrade(grades.site.grade, test.siteGrade)
            checkGrade(grades.enhanced.grade, test.enhancedGrade)

            try {
                await page.close()
            } catch (e) {}
        })
    })
})
