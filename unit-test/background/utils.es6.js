
const utils = require('../../shared/js/background/utils.es6')
const findParentTestCases = [
   {
           "url": "google.com",
           "parent": "Google"
   },
   {
           "url": "youtube.com",
           "parent": "Google"
   },
   {
           "url": "encrypted.google.com",
           "parent": "Google"
   },
   {
           "url": "duckduckgo.com",
           "parent": "undefined"
   }
]

describe('utils.findParent()', () => {
    findParentTestCases.forEach((test) => {
        it(`should return ${test.parent} as a parent for: ${test.url}`, () => {
            let result = utils.findParent(test.url.split('.'))

            if (test.parent === "undefined") {
                expect(result).toBe(undefined)
            } else {
                expect(result).toEqual(test.parent)
            }
        })
    })
});

describe('utils.isChromeBrowser()', () => {
    it('should return true in headless chrome', () => {
        let result = utils.isChromeBrowser()
        expect(result).toEqual(true)
    })
});

describe('utils.getBrowserName()', () => {
    it('should return chrome in headless chrome', () => {
        let result = utils.getBrowserName()
        expect(result).toEqual('chrome')
    })
});

describe('utils.getUpgradeToSecureSupport()', () => {
    it('should return false in headless chrome', () => {
        let result = utils.getUpgradeToSecureSupport()
        expect(result).toEqual(false)
    })
});
