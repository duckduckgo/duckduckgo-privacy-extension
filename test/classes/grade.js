const Grade = require('../../src/classes/grade')
const tests = require('../data/grade-cases')

let grade

describe('example grades', () => {
    beforeEach(() => {
        grade = new Grade()
    })

    tests.forEach((test) => {
        it(`should calculate the correct grade for ${test.url}`, () => {
            grade.setHttps(test.input.https, test.input.httpsAutoUpgrade)
            grade.setPrivacyScore(test.input.privacyScore)
            grade.setParentCompany(test.input.parentCompany, test.input.parentTrackerPrevalence)

            test.input.trackers.forEach((tracker) => {
                grade.addTracker(tracker)
            })

            grade.calculate()

            let gradeData = grade.get()

            expect(gradeData.site).toEqual(test.expected.site, 'site grade should be correct')
            expect(gradeData.enhanced).toEqual(test.expected.enhanced, 'enhanced grade should be correct')
        })
    })
})
