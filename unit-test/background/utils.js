const utils = require('../../shared/js/background/utils')
const tdsStorage = require('../../shared/js/background/storage/tds').default
const tds = require('./../data/tds')
const load = require('./../helpers/utils.js')
const config = require('./../data/extension-config.json')
const surrogates = require('./../data/surrogates').surrogates

const tdsStorageStub = require('../helpers/tds')

const findParentTestCases = [
    {
        url: 'google.com',
        parent: 'Google LLC'
    },
    {
        url: 'youtube.com',
        parent: 'Google LLC'
    },
    {
        url: 'encrypted.google.com',
        parent: 'Google LLC'
    },
    {
        url: 'duckduckgo.com',
        parent: 'undefined'
    }
]
const extractHostFromURLTestCases = [
    {
        url: 'http://google.com',
        result: 'google.com',
        resultWithWWW: 'google.com'
    },
    {
        url: 'https://www.duckduckgo.com/?q=test&atb=v126-7&ia=web',
        result: 'duckduckgo.com',
        resultWithWWW: 'www.duckduckgo.com'
    },
    {
        url: 'asdasdasd',
        result: 'asdasdasd',
        resultWithWWW: 'asdasdasd'
    },
    {
        url: 'www.bttf.duckduckgo.com',
        result: 'bttf.duckduckgo.com',
        resultWithWWW: 'www.bttf.duckduckgo.com'
    },
    {
        url: 'https://www.amazon.co.uk',
        result: 'amazon.co.uk',
        resultWithWWW: 'www.amazon.co.uk'
    },
    {
        url: 'https://127.0.0.1/test',
        result: '127.0.0.1',
        resultWithWWW: '127.0.0.1'
    },
    {
        url: 'https://[::1]/test',
        result: '::1',
        resultWithWWW: '::1'
    }
]

describe('utils find owner and parent function', () => {
    beforeAll(() => {
        load.loadStub({ tds, surrogates, config })
        tdsStorageStub.stub()
        return tdsStorage.getLists()
    })

    describe('utils.findParent()', () => {
        findParentTestCases.forEach((test) => {
            it(`should return ${test.parent} as a parent for: ${test.url}`, () => {
                const result = utils.findParent(test.url)
                if (test.parent === 'undefined') {
                    expect(result).toBe(undefined)
                } else {
                    expect(result).toEqual(test.parent)
                }
            })
        })
    })
})

describe('utils.getBrowserName()', () => {
    it('should return chrome in headless chrome', () => {
        const result = utils.getBrowserName()
        expect(result).toEqual('chrome')
    })
})

describe('utils.getUpgradeToSecureSupport()', () => {
    it('should return false in headless chrome', () => {
        const result = utils.getUpgradeToSecureSupport()
        expect(result).toEqual(false)
    })
})

describe('utils.isRedirect()', () => {
    it('should return false with non redirect codes', () => {
        for (let i = 0; i < 300; i++) {
            const result = utils.isRedirect(i)
            expect(result).toEqual(false)
        }
        for (let i = 400; i < 1000; i++) {
            const result = utils.isRedirect(i)
            expect(result).toEqual(false)
        }
    })
    it('should return true with redirect codes', () => {
        for (let i = 300; i < 400; i++) {
            const result = utils.isRedirect(i)
            expect(result).toEqual(true)
        }
    })
})

describe('utils.extractHostFromURL()', () => {
    extractHostFromURLTestCases.forEach((test) => {
        it(`should return ${test.result} as host for the url: ${test.url}`, () => {
            const result = utils.extractHostFromURL(test.url)
            expect(result).toEqual(test.result)
        })

        it(`should return ${test.resultWithWWW} as host for the url: ${test.url}`, () => {
            const result = utils.extractHostFromURL(test.url, true)
            expect(result).toEqual(test.resultWithWWW)
        })
    })
})

describe('utils.isSameTopLevelDomain()', () => {
    [
        ['example.com', 'example.com', true],
        ['example.com', 'www.example.com', true],
        ['localhost', 'localhost', true],
        ['ddg.local', 'sub.ddg.local', true],
        ['ddg.localhost', 'localhost', false],
        ['example.com', 'example.net', false],
        ['a.blogspot.com', 'b.blogspot.com', false],
        ['localhost', 'ddg', false],
        ['1.2.3.4', '1.2.3.4', true],
        ['127.0.0.1', 'localhost', false]
    ].forEach(([a, b, expected]) => {
        it(`returns ${expected} for ${a} and ${b}`, () => {
            if (expected) {
                expect(utils.isSameTopLevelDomain(a, b)).toBeTrue()
                expect(utils.isSameTopLevelDomain(b, a)).toBeTrue()
            } else {
                expect(utils.isSameTopLevelDomain(a, b)).toBeFalse()
                expect(utils.isSameTopLevelDomain(b, a)).toBeFalse()
            }
        })
    })
})

describe('utils.getBaseDomain()', () => {
    [
        ['com', null],
        ['.com', null],
        ['example.com', 'example.com'],
        ['www.example.com', 'example.com'],
        ['foo.www.example.com', 'example.com'],
        ['foo.www.example.com:8000', 'example.com'],
        ['www.example.app', 'example.app'],
        ['foo.apps.fbsbx.com', 'foo.apps.fbsbx.com'],
        ['bar.foo.apps.fbsbx.com', 'foo.apps.fbsbx.com'],
        ['apps.fbsbx.com', null],
        ['1.2.3.4', '1.2.3.4'],
        ['127.0.0.1', '127.0.0.1'],
        ['localhost', 'localhost'],
        ['ddg.localhost', 'ddg.localhost'],
        ['sub.ddg.local', 'ddg.local'],
        ['abcefg', null],
        ['1234', null]
    ].forEach(([hostname, baseDomain]) => {
        it(`returns ${baseDomain} for ${hostname}`, () => {
            expect(utils.getBaseDomain(hostname)).toBe(baseDomain)
        })
    })
})

describe('utils.parseVersionString', () => {
    const cases = [
        ['12', { major: 12, minor: 0, patch: 0 }],
        ['12.1', { major: 12, minor: 1, patch: 0 }],
        ['12.1.1', { major: 12, minor: 1, patch: 1 }],
        ['100002.1.1', { major: 100002, minor: 1, patch: 1 }],
        ['broken.string.parse', { major: NaN, minor: NaN, patch: NaN }]
    ]
    for (const testCase of cases) {
        const [versionString, expectedOutcome] = testCase
        it(`returns ${JSON.stringify(expectedOutcome)} for ${versionString}`, () => {
            expect(utils.parseVersionString(versionString)).toEqual(expectedOutcome)
        })
    }
})

describe('utils.satisfiesMinVersion', () => {
    // Min version, Extension version, outcome
    const cases = [
        ['12', '12', true],
        ['12', '13', true],
        ['12.1', '12.1', true],
        ['12.1.1', '12.1.1', true],
        ['12.1.1', '12.1.2', true],
        ['12.1.1', '12.2.0', true],
        ['13.12.12', '12.12.12', false],
        ['12.13.12', '12.12.12', false],
        ['12.12.13', '12.12.12', false],
        ['102.12.12', '102.12.11', false],
        ['102.12.12', '102.12.12', true],
        ['102.12.12', '102.12.13', true]
    ]
    for (const testCase of cases) {
        const [versionString, extensionVersionString, expectedOutcome] = testCase
        it(`returns ${JSON.stringify(expectedOutcome)} for ${versionString} compared to ${extensionVersionString}`, () => {
            expect(utils.satisfiesMinVersion(versionString, extensionVersionString)).toEqual(expectedOutcome)
        })
    }
})

describe('utils.getInstallTimestamp()', () => {
    it('should return correct date for end of week', () => {
        const result = utils.getInstallTimestamp('v35-7')
        expect(result).toEqual(1477353600000) // Tue Oct 25 2016
    })

    it('should return correct date for beginning of week', () => {
        const result = utils.getInstallTimestamp('v36-1')
        expect(result).toEqual(1477440000000) // Wed Oct 26 2016
    })

    it('should return null for invalid atb value', () => {
        const result = utils.getInstallTimestamp('123')
        expect(result).toEqual(null)
    })
})

describe('utils.isInstalledWithinDays()', () => {
    it('should return true as installed within 3 days', () => {
        const date = 1477609200000 // Fri Oct 28 2016
        const result = utils.isInstalledWithinDays(3, date, 'v35-7')
        expect(result).toEqual(true)
    })

    it('should return false as not installed within 3 days', () => {
        const date = 1477695600000 // Sat Oct 29 2016
        const result = utils.isInstalledWithinDays(3, date, 'v35-7')
        expect(result).toEqual(false)
    })

    it('should return true as installed within 4 days', () => {
        const date = 1477695600000 // Sat Oct 29 2016
        const result = utils.isInstalledWithinDays(4, date, 'v35-7')
        expect(result).toEqual(true)
    })

    it('should return false for missing atb value', () => {
        const date = 1477695600000 // Sat Oct 29 2016
        const result = utils.isInstalledWithinDays(4, date, null)
        expect(result).toEqual(false)
    })
})
