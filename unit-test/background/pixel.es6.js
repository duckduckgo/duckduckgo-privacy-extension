
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
        'constantParams': {
            'browser': 'firefox',
            'extensionVersion': '8.18.2018',
            'atb': 'v129-2a'
        },
        'params': [
            'param1',
            'param2'
        ],
        'partialResult': '_param1_param2'
    },
    {
        'constantParams': {
            'browser': 'chrome',
            'extensionVersion': '',
            'atb': 'v129-2a'
        },
        'params': [],
        'partialResult': ''
    },
    {
        'constantParams': {
            'browser': 'firefox',
            'extensionVersion': '8.18.2018',
            'atb': ''
        },
        'params': [
            'param1'
        ],
        'partialResult': '_param1'
    },
    {
        'constantParams': {
            'browser': '',
            'extensionVersion': '',
            'atb': ''
        },
        'params': [
            'param1',
            'param2'
        ],
        'partialResult': '_param1_param2'
    }
]

const stubGetAdditionalParams = (ops) => {
    spyOn(pixel, 'getAdditionalParams').and.callFake(function () {
        return ops
    })
}

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
        beforeEach(function () {
        })

        it(`should return a string containing ${test.partialResult} and ${test.constantParams} for params: ${test.params}`, () => {
            stubGetAdditionalParams(test.constantParams)
            let result = pixel.concatParams(test.params)
            expect(result).toMatch(test.partialResult)

            Object.keys(test.constantParams).forEach((key) => {
                let val = test.constantParams[key]
                if (val) {
                    let paramString = '&' + key + '=' + val
                    expect(result).toMatch(paramString)
                }
            })
        })
    })
})
