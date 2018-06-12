const Grade = require('../../src/classes/grade')
const exampleGradeTests = require('../data/grade-cases')

let grade

describe('example grades', () => {
    beforeEach(() => {
        grade = new Grade()
    })

    exampleGradeTests.forEach((test) => {
        it(`should calculate the correct grade for ${test.url}`, () => {
            grade.setHttps(test.input.https, test.input.httpsAutoUpgrade)
            grade.setPrivacyScore(test.input.privacyScore)
            grade.setParentEntity(test.input.parentCompany, test.input.parentTrackerPrevalence)

            test.input.trackers.forEach((tracker) => {
                grade.addTracker(tracker)
            })

            grade.calculate()

            let gradeData = grade.getGrades()

            expect(gradeData.site).toEqual(test.expected.site, 'site grade should be correct')
            expect(gradeData.enhanced).toEqual(test.expected.enhanced, 'enhanced grade should be correct')
        })
    })
})

describe('constructor', () => {
    it('should be able to use attributes passed in via the constructor', () => {
        grade = new Grade({
            hasHttps: true,
            isAutoUpgradeable: true,
            parentCompany: 'Oath',
            privacyScore: 5,
            prevalence: 7.06,
            trackersBlocked: {
                comScore: {
                    prevalence: 12.75,
                    'scorecardresearch.com': {
                        blocked: true,
                        parentCompany: 'comScore',
                        reason: 'trackersWithParentCompany',
                        type: 'Analytics',
                        url: 'scorecardresearch.com'
                    }
                }
            },
            trackersNotBlocked: {
                'Amazon.com': {
                    prevalence: 14.15,
                    's3.amazonaws.com':{
                        parentCompany: 'Amazon.com',
                        url: 's3.amazonaws.com',
                        type: 'trackersWhitelist',
                        block: false,
                        reason: 'whitelisted'
                    }
                }
            }
        })

        expect(grade.hasHttps).toEqual(true)
        expect(grade.isAutoUpgradeable).toEqual(true)
        expect(grade.privacyScore).toEqual(5)
        expect(grade.companiesBlocked).toEqual({
            comScore: 12.75
        })
        expect(grade.companiesNotBlocked).toEqual({
            Oath: 7.06,
            'Amazon.com': 14.15
        })
    })
})
