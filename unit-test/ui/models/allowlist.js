import '../../../shared/js/ui/base/index'
const Allowlist = require('../../../shared/js/ui/models/allowlist')

let allowlist

const domainTestCases = [
    {
        url: 'duckduckgo.com',
        allowlistedDomain: 'duckduckgo.com',
        valid: true,
    },
    {
        url: 'bttf.duckduckgo.com',
        allowlistedDomain: 'duckduckgo.com',
        valid: true,
    },
    {
        url: 'duckduckgo.com/?q=test&ia=web',
        allowlistedDomain: 'duckduckgo.com',
        valid: true,
    },
    {
        url: 'www.duckduckgo.com',
        allowlistedDomain: 'duckduckgo.com',
        valid: true,
    },
    {
        url: 'testwww.com',
        allowlistedDomain: 'testwww.com',
        valid: true,
    },
    {
        url: 'www.testwww.com',
        allowlistedDomain: 'testwww.com',
        valid: true,
    },
    {
        url: 'duckduck',
        allowlistedDomain: '',
        valid: false,
    },
    {
        url: '127.0.0.1',
        allowlistedDomain: '127.0.0.1',
        valid: true,
    },
    {
        url: 'localhost',
        allowlistedDomain: 'localhost',
        valid: true,
    },
    {
        url: 'localhost:5000',
        allowlistedDomain: 'localhost',
        valid: true,
    },
    {
        url: 'localhost:asdasdasd',
        allowlistedDomain: '',
        valid: false,
    },
    {
        url: '',
        allowlistedDomain: '',
        valid: false,
    },
]

describe('allowlist.addDomain()', () => {
    allowlist = new Allowlist({})
    domainTestCases.forEach((test) => {
        it(`should return ${test.valid} for ${test.url}`, () => {
            const result = allowlist.addDomain(test.url)
            if (test.valid) {
                expect(result).toBe(test.allowlistedDomain)
            } else {
                expect(result).toBe(null)
            }
        })
    })
})
