const Whitelist = require('../../../shared/js/ui/models/whitelist.es6')

let whitelist

const domainTestCases = [
  {
        "url": "duckduckgo.com",
        "valid": true
  },
  {
        "url": "duckduck",
        "valid": false
  },
  {
        "url": "localhost",
        "valid": true
  },
  {
        "url": "",
        "valid": false
  }
]

describe('whitelist.addDomain()', () => {
    whitelist = new Whitelist({})
    domainTestCases.forEach((test) => {
        it(`should return ${test.valid} for ${test.url}`, () => {
            let result = whitelist.addDomain(test.url)
            if (test.valid) {
                expect(result).toBe(test.url.toLowerCase())
            } else {
                expect(result).toBe(null)
            }
        })
    })
})
