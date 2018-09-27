
const pixel = require('../../shared/js/background/pixel.es6')
const url = 'https://improving.duckduckgo.com/t/'
const getURLTestCases = [
    {
        'pixelName': 'ep',
        'result': url + 'ep'
    },
    {
        'pixelName': '',
        'result': undefined
    },
    {
        'pixelName': undefined,
        'result': undefined
    }
]
const concatParamsTestCases = [
    {
        'params': [],
        'result': '?1000000'
    },
    {
        'params': [
            'param1'
        ],
        'result': '_param1?1000000'
    },
    {
        'params': [
            'param1',
            'param2'
        ],
        'result': '_param1_param2?1000000'
    },
    {
        'params': [
            'param1',
            {
                'p2': 'param2',
                'p3': 'param3'
            }
        ],
        'result': '_param1?1000000&p2=param2&p3=param3'
    },
    {
        'params': [
            {
                'p2': 'param2',
                'p3': 'param3'
            },
            'param1'
        ],
        'result': '_param1?1000000&p2=param2&p3=param3'
    },
    {
        'params': [
            {
                'p2': 1,
                'p3': 0
            },
            'param1'
        ],
        'result': '_param1?1000000&p2=1&p3=0'
    },
    {
        'params': [
            {
                'p3': 'param3',
                'p4': 'param4'
            },
            'param1',
            {
                'p5': 'param5',
                'p6': 'param6'
            },
            'param2'
        ],
        'result': '_param1_param2?1000000&p3=param3&p4=param4&p5=param5&p6=param6'
    }
]

describe('pixel.getURL()', () => {
    getURLTestCases.forEach((test) => {
        it(`should return ${test.result} as a result given the pixelName: ${test.pixelName}`, () => {
            let result = pixel.getURL(test.pixelName)
            expect(result).toBe(test.result)
        })
    })
})

describe('pixel.concatParams()', () => {
    beforeEach(() => {
        spyOn(Math, 'random').and.returnValue(0.1)
    })

    concatParamsTestCases.forEach((test) => {
        it(`should return a string containing ${test.result} and for params: ${test.params}`, () => {
            let result = pixel.concatParams(test.params)
            expect(result).toBe(test.result)
        })
    })
})
