const surrogates = require('../src/surrogates')
const btoa = require('btoa')

const trackerOne = `(function() {
    window._foo = function() {}
})();`
const trackerOneBase64 = btoa(trackerOne)

const trackerTwo = `(function() {
    window._bar = function() {}
})();`
const trackerTwoBase64 = btoa(trackerTwo)

surrogates.addLists(`
tracker-one.com/tracks.js application/javascript
${trackerOne}

# comment
tracker-two.com/tracks.js application/javascript
${trackerTwo}
`)

describe('getContentForUrl', () => {
    let tests = [
        {
            url: 'https://tracker-one.com/tracks.js',
            parsedUrl: { domain: 'tracker-one.com' },
            expectedBase64: trackerOneBase64
        },
        {
            url: 'https://tracker-two.com/tracks.js',
            parsedUrl: { domain: 'tracker-two.com' },
            expectedBase64: trackerTwoBase64
        },
        {
            url: 'https://en.www.tracker-one.com/foo/bar/tracks.js',
            parsedUrl: { domain: 'tracker-one.com' },
            expectedBase64: trackerOneBase64
        },
        {
            url: 'https://en.www.tracker-one.com/foo/bar/tracks.js?a=b',
            parsedUrl: { domain: 'tracker-one.com' },
            expectedBase64: trackerOneBase64
        }
    ]

    tests.forEach((test) => {
        it('should be able to pass surrogate content properly', () => {
            let surrogateContent = surrogates.getContentForUrl(test.url, test.parsedUrl)

            expect(surrogateContent).toEqual(`data:application/javascript;base64,${test.expectedBase64}`)
        })
    })
})
