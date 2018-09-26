
const utils = require('../../shared/js/background/utils.es6')
const findParentTestCases = [
    {
        'url': 'google.com',
        'parent': 'Google'
    },
    {
        'url': 'youtube.com',
        'parent': 'Google'
    },
    {
        'url': 'encrypted.google.com',
        'parent': 'Google'
    },
    {
        'url': 'duckduckgo.com',
        'parent': 'undefined'
    }
]
const extractHostFromURLTestCases = [
    {
        'url': 'http://google.com',
        'result': 'google.com',
        'resultWithWWW': 'google.com'
    },
    {
        'url': 'https://www.duckduckgo.com/?q=test&atb=v126-7&ia=web',
        'result': 'duckduckgo.com',
        'resultWithWWW': 'www.duckduckgo.com'
    },
    {
        'url': 'asdasdasd',
        'result': 'asdasdasd',
        'resultWithWWW': 'asdasdasd'
    },
    {
        'url': 'www.bttf.duckduckgo.com',
        'result': 'bttf.duckduckgo.com',
        'resultWithWWW': 'www.bttf.duckduckgo.com'
    },
    {
        'url': 'https://www.amazon.co.uk',
        'result': 'amazon.co.uk',
        'resultWithWWW': 'www.amazon.co.uk'
    }
]

describe('utils.findParent()', () => {
    findParentTestCases.forEach((test) => {
        it(`should return ${test.parent} as a parent for: ${test.url}`, () => {
            let result = utils.findParent(test.url)
            if (test.parent === 'undefined') {
                expect(result).toBe(undefined)
            } else {
                expect(result).toEqual(test.parent)
            }
        })
    })
})

describe('utils.getBrowserName()', () => {
    it('should return chrome in headless chrome', () => {
        let result = utils.getBrowserName()
        expect(result).toEqual('chrome')
    })
})

describe('utils.getUpgradeToSecureSupport()', () => {
    it('should return false in headless chrome', () => {
        let result = utils.getUpgradeToSecureSupport()
        expect(result).toEqual(false)
    })
})

describe('utils.extractHostFromURL()', () => {
    extractHostFromURLTestCases.forEach((test) => {
        it(`should return ${test.result} as host for the url: ${test.url}`, () => {
            let result = utils.extractHostFromURL(test.url)
            expect(result).toEqual(test.result)
        })

        it(`should return ${test.resultWithWWW} as host for the url: ${test.url}`, () => {
            let result = utils.extractHostFromURL(test.url, true)
            expect(result).toEqual(test.resultWithWWW)
        })
    })
})

describe('utils.getUpgradeToSecureSupport()', () => {
    it('should return ping in headless chrome', () => {
        let result = utils.getBeaconName()
        const chromeBeaconName = 'ping'
        expect(result).toEqual(chromeBeaconName)
    })
})
