const pixel = require('../../shared/js/background/pixels')
const url = 'https://improving.duckduckgo.com/t/'
const getURLTestCases = [
    {
        pixelName: 'ep',
        result: url + 'ep',
    },
]

describe('pixel.getURL()', () => {
    getURLTestCases.forEach((test) => {
        it(`should return ${test.result} as a result given the pixelName: ${test.pixelName}`, () => {
            const result = pixel.getURL(test.pixelName)
            expect(result).toBe(test.result)
        })
    })

    it('Should throw with an empty pixelName', () => {
        expect(() => pixel.getURL('')).toThrow()
    })

    it('Should throw with pixelName undefined', () => {
        expect(() => pixel.getURL()).toThrow()
    })
})
