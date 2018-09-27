const Site = require('../../../shared/js/background/classes/site.es6')
const browserWrapper = require('../../../shared/js/background/chrome-wrapper.es6')

describe('Site', () => {
    beforeEach(() => {
        spyOn(browserWrapper, 'getExtensionId').and.returnValue('ogigmfedpbpnnbcpgjloacccaibkaoip')
    })

    describe('getSpecialDomain()', () => {
        const tests = [
            { url: 'https://duckduckgo.com', expected: null },
            { url: 'chrome://extensions', expected: 'extensions' }
        ]

        tests.forEach((test) => {
            it(`should return "${test.expected}" for: ${test.url}`, () => {
                const site = new Site(test.url)

                expect(site.specialDomainName).toEqual(test.expected)
            })
        })
    })
})
