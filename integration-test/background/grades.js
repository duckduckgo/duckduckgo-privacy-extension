const harness = require('../helpers/harness')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')

const tests = [
    { url: 'duckduckgo.com', siteGrade: 'A', enhancedGrade: 'A' },
    // Fixme flaking
    // { url: 'www.independent.co.uk', siteGrade: ['D', 'D-'], enhancedGrade: 'B' },
    { url: 'google.com', siteGrade: 'D', enhancedGrade: 'D' },
    { url: 'reddit.com', siteGrade: ['D', 'D-', 'C'], enhancedGrade: 'B' },
    { url: 'facebook.com', siteGrade: ['D', 'C+'], enhancedGrade: 'C+' },
    // FIXME - This case is flaking.
    //         Enhanced grade is something B and sometimes C.
    // { url: 'twitter.com', siteGrade: 'C', enhancedGrade: 'B' },
    { url: 'en.wikipedia.org', siteGrade: 'B+', enhancedGrade: 'B+' }
]

let browser
let bgPage
let teardown

// getting HTTPS can take a while
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000

const getGradeByUrl = (url) => {
    const tabsById = globalThis.dbg.tabManager.tabContainer
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
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)
    })
    afterAll(async () => {
        try {
            await teardown()
        } catch (e) {}
    })

    tests.forEach(test => {
        it(`${test.url} should be graded as a ${test.siteGrade} -> ${test.enhancedGrade}`, async () => {
            const page = await browser.newPage()
            const ua = await browser.userAgent()
            await page.setUserAgent(ua.replace(/Headless /, ''))

            await pageWait.forGoto(page, `http://${test.url}`)

            const grades = await bgPage.evaluate(getGradeByUrl, test.url)
            checkGrade(grades.site.grade, test.siteGrade)
            checkGrade(grades.enhanced.grade, test.enhancedGrade)

            await page.close()
        })
    })
})
