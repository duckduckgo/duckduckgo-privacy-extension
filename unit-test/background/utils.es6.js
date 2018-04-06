
const utils = require('../../shared/js/background/utils.es6')
const findParentTestCases = require('../data/find-parent-test-cases')
const majorNetworks = require('../data/major-networks')

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
