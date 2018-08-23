
const pixel = require('../../shared/js/background/pixel.es6')
const url = 'https://improving.duckduckgo.com/t/'
const getURLTestCases = [
    {
        'pixelName': 'ep',
        'result' : url + 'ep'
    },
    {
        'pixelName': '',
        'result' : 'undefined'
    },
    {
        'pixelName': 'undefined',
        'result' : 'undefined'
    }
]
const concatParamsTestCases = [
    {
        'constantParams' : {
            'browser' : 'firefox',
            'extensionVersion' : '8.18.2018',
            'atb' : 'v129-2a'
        },
        'params': [
            'param1',
            'param2'
        ],
        'partialResult': '_param1_param2'
    },
    {
        'constantParams' : {
            'browser' : 'chrome',
            'extensionVersion' : '',
            'atb' : 'v129-2a'
        },
        'params': [],
        'partialResult': ''
    },
    {
        'constantParams' : {
            'browser' : 'firefox',
            'extensionVersion' : '8.18.2018',
            'atb' : ''
        },
        'params': [
            'param1'
        ],
        'partialResult': '_param1'
    },
    {
        'constantParams' : {
            'browser' : '',
            'extensionVersion' : '',
            'atb' : ''
        },
        'params': [
            'param1',
            'param2'
        ],
        'partialResult': '_param1_param2'
    }
]

describe('pixel.getURL()', () => {
    getURLTestCases.forEach((test) => {
        it(`should return ${test.result} as a result given the pixelName: ${test.pixelName}`, () => {
            let result

            if (test.pixelName === 'undefined') {
                result = pixel.getURL()
                expect(result).toBe(undefined)
            } else {
                result = pixel.getURL(test.pixelName)
                expect(result).toEqual(test.result)
            }
        })
    })
})

describe('pixel.concatParams()', () => {
    concatParamsTestCases.forEach((test) => {

        beforeEach(function() {
            spyOn(pixel, 'getAdditionalParams').and.callFake(function() {
                return test.contantParams
            })
        })

        it(`should return a string containing ${test.partialResult} for params: ${test.params}`, () => {
            let result = pixel.concatParams(test.params)
            expect(result).toMatch(test.partialResult)
        })

/*
        it(`should return ${test.resultWithWWW} as host for the url: ${test.url}`, () => {
            let result = pixel.extractHostFromURL(test.url, true)
            expect(result).toEqual(test.resultWithWWW)
        }) */
    })
})
