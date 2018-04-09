const utils = require('../../../shared/js/background/utils.es6')
const Score = require('../../../shared/js/background/classes/score.es6')
const gradeTestCases = require('../../data/grade-cases')
const isaMajorNetworkTestCases = [
   {
      "specialPage": 0,
      "domain": "facebook.com",
      "parent": "Facebook",
      "isZeroResult": 0,
      "descr": "a number greater than zero for Google (major network)" 
   },
   {
      "specialPage": 0,
      "domain": "",
      "parent": "",
      "isZeroResult": 1,
      "descr": "zero, because we have no domain"
   },
   {
      "specialPage": 1,
      "domain": "",
      "parent": "",
      "isZeroResult": 1,
      "descr": "zero, because it's a special page" 
   },
   {
      "specialPage": 0,
      "domain": "duckduckgo.com",
      "parent": "",
      "isZeroResult": 1,
      "descr": "zero, because of no major network parent"
   }
]

let score

describe('score', () => {
    beforeEach(() => {
        score = new Score()
        //spyOn(utils, 'findParent')
    })

    gradeTestCases.forEach((test) => {
        it(`should return the correct grades for: ${test.descr}`, () => {
            Object.keys(test.values).forEach((prop) => {
                score[prop] = test.values[prop]
            })

            let result = score.get()

            expect(result.before).toEqual(test.result.before)
            expect(result.after).toEqual(test.result.after)
            expect(result.beforeIndex).toEqual(test.result.beforeScore)
            expect(result.afterIndex).toEqual(test.result.afterScore)
        })
    })
});

describe('isaMajorNetwork', () => {
    isaMajorNetworkTestCases.forEach((test) => {
        it(`should return ${test.descr}`, () => {
            spyOn(utils, 'findParent').and.returnValue(test.parent)
            score = new Score(test.specialPage, test.domain)
 
            if (test.parent) {
                let slicedDomain = test.domain.split('.')
                expect(utils.findParent).toHaveBeenCalledWith(slicedDomain)
            }

            let result = score.isaMajorTrackingNetwork

            if (test.isZeroResult) {
                expect(result).toEqual(0)
            } else {
                expect(result).toBeGreaterThan(0)
            }
        })
    })
});
