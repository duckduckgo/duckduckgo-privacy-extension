
const pixel = require('../../shared/js/background/pixel.es6')
const url = 'https://improving.duckduckgo.com/t/'
const getURLTestCases = [
    {
        'pixelName': 'ep',
        'result': url + 'ep'
    },
    {
        'pixelName': '',
        'result': 'undefined'
    },
    {
        'pixelName': 'undefined',
        'result': 'undefined'
    }
]
const concatParamsTestCases = [
    {
        'params': [],
        'partialResult': ''
    },
    {
        'params': [
            'param1'
        ],
        'partialResult': '_param1'
    },
    {
        'params': [
            'param1',
            'param2'
        ],
        'partialResult': '_param1_param2'
    }
]

describe('pixel.getURL()', () => {
    getURLTestCases.forEach((test) => {
        beforeEach(function () {
            Object.keys(test).forEach((key) => {
                test[key] = (test[key] === 'undefined') ? undefined : test[key]
            })
        })

        it(`should return ${test.result} as a result given the pixelName: ${test.pixelName}`, () => {
            let result = pixel.getURL(test.pixelName)
            expect(result).toBe(test.result)
        })
    })
})

describe('pixel.concatParams()', () => {
    concatParamsTestCases.forEach((test) => {
        it(`should return a string containing ${test.partialResult} and for params: ${test.params}`, () => {
            let result = pixel.concatParams(test.params)
            expect(result).toMatch(test.partialResult)
        })
    })
})
