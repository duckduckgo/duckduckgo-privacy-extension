const Whitelist = require('../../../shared/js/ui/models/whitelist.es6')

let whitelist

const domainTestCases = [
    {
        'url': 'duckduckgo.com',
        'whitelistedDomain': 'duckduckgo.com',
        'valid': true
    },
    {
        'url': 'bttf.duckduckgo.com',
        'whitelistedDomain': 'duckduckgo.com',
        'valid': true
    },
    {
        'url': 'duckduckgo.com/?q=test&ia=web',
        'whitelistedDomain': 'duckduckgo.com',
        'valid': true
    },
    {
        'url': 'www.duckduckgo.com',
        'whitelistedDomain': 'duckduckgo.com',
        'valid': true
    },
    {
        'url': 'duckduck',
        'whitelistedDomain': '',
        'valid': false
    },
    {
        'url': 'localhost',
        'whitelistedDomain': 'localhost',
        'valid': true
    },
    {
        'url': 'localhost:5000',
        'whitelistedDomain': 'localhost',
        'valid': true
    },
    {
        'url': 'localhost:asdasdasd',
        'whitelistedDomain': '',
        'valid': false
    },
    {
        'url': '',
        'whitelistedDomain': '',
        'valid': false
    }
]

describe('whitelist.addDomain()', () => {
    whitelist = new Whitelist({})
    domainTestCases.forEach((test) => {
        it(`should return ${test.valid} for ${test.url}`, () => {
            let result = whitelist.addDomain(test.url)
            if (test.valid) {
                expect(result).toBe(test.whitelistedDomain)
            } else {
                expect(result).toBe(null)
            }
        })
    })
})
