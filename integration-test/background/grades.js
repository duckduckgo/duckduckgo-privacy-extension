/* global dbg:false */
const harness = require('../helpers/harness')

const tests = [
    { url: 'duckduckgo.com', siteGrade: 'A', enhancedGrade: 'A' },
    { url: 'theguardian.com', siteGrade: 'D-', enhancedGrade: 'B+' },
    { url: 'google.com', siteGrade: 'D', enhancedGrade: 'D' }
]

let browser
let bgPage

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

    const gradeData = tab.site.grade.get()

    return {
        siteGrade: gradeData.site.grade,
        enhancedGrade: gradeData.enhanced.grade
    }
}

describe('grade sanity checks', () => {
    beforeAll(async () => {
        ({ browser, bgPage } = await harness.setup())
    })
    afterAll(async () => {
        await harness.teardown(browser)
    })

    tests.forEach(async (test) => {
        it(`${test.url} should be graded as a ${test.siteGrade} -> ${test.enhancedGrade}`, async () => {
            const page = await browser.newPage()

            await page.goto(`http://${test.url}`, { waitUntil: 'networkidle2' })

            const grades = await bgPage.evaluate(getGradeByUrl, test.url)

            expect(grades.siteGrade).toEqual(test.siteGrade)
            expect(grades.enhancedGrade).toEqual(test.enhancedGrade)

            await page.close()
        })
    })
})
