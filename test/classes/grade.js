const utils = require('../../src/utils')
const Grade = require('../../src/classes/grade')
const gradeTestCases = require('../data/grade-cases')
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

let grade

describe('grade', () => {
    beforeEach(() => {
        grade = new Grade()
    })

    gradeTestCases.forEach((test) => {
        it(`should return the correct grades for: ${test.descr}`, () => {
            Object.keys(test.values).forEach((prop) => {
                grade[prop] = test.values[prop]
            })

            let result = grade.get()

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
            grade = new Grade(test.domain, test.specialPage)
 
            if (test.parent) {
                expect(utils.findParent).toHaveBeenCalledWith(test.slicedDomain)
            }

            let result = grade.isaMajorTrackingNetwork

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
            grade = new Grade(test.domain)
 
            let result = grade.tosdr
            let message = result.message

            if (test.isMessageBad) {
                expect(message).toEqual('Bad')
            } else {
                expect(message).not.toEqual('Bad')
            }
        })
    })
});
