const parseUserAgentString = require('../../shared/js/shared-utils/parse-user-agent-string')

const tests = [
    {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36',
        expectedBrowser: 'Chrome',
        expectedVersion: '66',
    },
    {
        ua: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.75 Safari/537.36',
        expectedBrowser: 'Chrome',
        expectedVersion: '49',
    },
    {
        ua: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:60.0) Gecko/20100101 Firefox/60.0',
        expectedBrowser: 'Firefox',
        expectedVersion: '60',
    },
    {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:58.0) Gecko/20100101 Firefox/58.0',
        expectedBrowser: 'Firefox',
        expectedVersion: '58',
    },
    {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36 OPR/89.0.4447.83',
        expectedBrowser: 'Opera',
        expectedVersion: '89',
    },
    {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.28',
        expectedBrowser: 'Edg',
        expectedVersion: '107',
    },
]

describe('parseUserAgentString', () => {
    tests.forEach((test) => {
        it(`should be able to parse ${test.ua}`, () => {
            const result = parseUserAgentString(test.ua)

            expect(result.browser).toEqual(test.expectedBrowser)
            expect(result.version).toEqual(test.expectedVersion)
        })
    })
})
