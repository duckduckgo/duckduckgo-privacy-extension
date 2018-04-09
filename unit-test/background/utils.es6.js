
const utils = require('../../shared/js/background/utils.es6')
const findParentTestCases = [
   {
           "url": "google.com",
           "parent": "Google"
   },
   {
           "url": "youtube.com",
           "parent": "Google"
   },
   {
           "url": "duckduckgo.com",
           "parent": "undefined"
   }
]

describe('utils.findParent()', () => {
    findParentTestCases.forEach((test) => {
        it(`should return ${test.parent} as a parent for: ${test.url}`, () => {
            let result = utils.findParent(test.url.split('.'))

            if (test.parent === "undefined") {
                expect(result).toBe(undefined)
            } else {
                expect(result).toEqual(test.parent)
            }
        })
    })
});
