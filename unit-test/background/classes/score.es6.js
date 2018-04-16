const utils = require('../../../shared/js/background/utils.es6')
const Score = require('../../../shared/js/background/classes/score.es6')
const gradeTestCases = require('../../data/grade-cases')
const isaMajorNetworkTestCases = [
   {
      "specialPage": 0,
      "domain": "facebook.com",
      "slicedDomain": ["facebook", "com"],
      "parent": "Facebook",
      "isZeroResult": 0,
      "descr": "a number greater than zero for Facebook (major network)" 
   },
   {
      "specialPage": 0,
      "domain": "encrypted.google.com",
      "slicedDomain": ["google", "com"],
      "parent": "Google",
      "isZeroResult": 0,
      "descr": "a number greater than zero for Google (major network)" 
   },
   {
      "specialPage": 0,
      "domain": "",
      "slicedDomain": [],
      "parent": "",
      "isZeroResult": 1,
      "descr": "zero, because we have no domain"
   },
   {
      "specialPage": 1,
      "domain": "",
      "slicedDomain": [],
      "parent": "",
      "isZeroResult": 1,
      "descr": "zero, because it's a special page" 
   },
   {
      "specialPage": 0,
      "domain": "duckduckgo.com",
      "slicedDomain": ["duckduckgo", "com"],
      "parent": "",
      "isZeroResult": 1,
      "descr": "zero, because of no major network parent"
   },
   {
      "specialPage": 0,
      "domain": "bttf.duckduckgo.com",
      "slicedDomain": ["duckduckgo", "com"],
      "parent": "",
      "isZeroResult": 1,
      "descr": "zero, because of no major network parent"
   }
]

const tosdrTestCases = [
    {
        "domain": "google.com",
        "isMessageBad": 1,
        "descr": "bad tosdr rating for google.com"
    },
    {
        "domain": "encrypted.google.com",
        "isMessageBad": 1,
        "descr": "bad tosdr rating for encrypted.google.com (match domain)"
    },
    {
        "domain": "youtube.com",
        "isMessageBad": 1,
        "descr": "bad tosdr rating for youtube.com"
    },
    {
        "domain": "duckduckgo.com",
        "isMessageBad": 0,
        "descr": "good tosdr rating for duckduckgo.com"
    },
    {
        "domain": "bttf.duckduckgo.com",
        "isMessageBad": 0,
        "descr": "good tosdr rating for bttf.duckduckgo.com"
    },
    {
        "domain": "deletefacebook.com",
        "isMessageBad": 0,
        "descr": "not bad tosdr rating for deletefacebook.com"
    }
]

let score

describe('score', () => {
    beforeEach(() => {
        score = new Score()
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
                expect(utils.findParent).toHaveBeenCalledWith(test.slicedDomain)
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

describe('getTosdr', () => {
    tosdrTestCases.forEach((test) => {
        it(`should return ${test.descr}`, () => {
            score = new Score('', test.domain)
 
            let result = score.tosdr
            let message = result.message

            if (test.isMessageBad) {
                expect(message).toEqual('Bad')
            } else {
                expect(message).not.toEqual('Bad')
            }
        })
    })
});

// piggy back on the existing grade scores, and make sure decisions are updated properly
describe('decisions', () => {
    // re-use instance of the score class so we can validate grades are
    // getting cleared between invocations of get()
    score = new Score()
    gradeTestCases.forEach((test) => {
        it(`should get decisions correctly for case: ${test.grade}`, () => {
            Object.keys(test.values).forEach((prop) => {
                score[prop] = test.values[prop]
            })

            let result = score.get()

            let decisions = score.decisions
            let currentIndex = 0

            expect(decisions instanceof Array).toBeTruthy()
            decisions.forEach((decision) => {
                expect(typeof decision.why).toBe('string', 'every decision should have a reason')
                expect(decision.grade).toMatch(/^[A-F]$/,'every decision should include the grade')

                currentIndex += decision.change
                expect(currentIndex).toEqual(decision.index,'the decision index should match what the change says')
            })

            expect(currentIndex).toEqual(result.beforeIndex,'all the changes in the decisions should match the final score reported')
        })
    })
})
