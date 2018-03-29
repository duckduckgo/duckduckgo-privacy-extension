const Score = require('../../../shared/js/background/classes/score.es6')
const testCases = require('../../data/grade-cases')
let score

describe('score', () => {
    beforeEach(() => {
        score = new Score()
    })

    testCases.forEach((test) => {
        it(`should return the correct grades for: ${test.descr}`, () => {
            Object.keys(test.values).forEach((prop) => {
                score[prop] = test.values[prop]
            })

            let result = score.get()

            expect(result.before).toEqual(test.result.before)
            expect(result.after).toEqual(test.result.after)
        })
    })
});
