const https = require('../src/https')

https.addLists([
    'github.com',
    'status.github.com'
])

describe('getUpgradedUrl', () => {
    let tests = [
        { url: 'http://github.com/', shouldUpgrade: true },
        { url: 'http://status.github.com/', shouldUpgrade: true },
        { url: 'http://test.github.com/', shouldUpgrade: false },
        { url: 'http://github.io/', shouldUpgrade: false },

        { url: 'http://github.com/duckduckgo/', shouldUpgrade: true },
        { url: 'http://github.com/duckduckgo/?query=string', shouldUpgrade: true }
    ]

    tests.forEach((test) => {
        it(`should ${test.shouldUpgrade ? '' : 'not '}upgrade ${test.url}`, () => {
            let upgraded = https.getUpgradedUrl(test.url)

            if (test.shouldUpgrade) {
                expect(upgraded).toEqual(test.url.replace(/^http:/, 'https:'))
            } else {
                expect(upgraded).not.toEqual(test.url.replace(/^http:/, 'https:'))
            }
        })
    })
})
