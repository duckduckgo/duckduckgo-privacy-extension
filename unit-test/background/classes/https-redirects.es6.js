const HttpsRedirects = require('../../../shared/js/background/classes/https-redirects.es6')
const tk = require('timekeeper')
let httpsRedirects

const setup = () => {
    httpsRedirects = new HttpsRedirects()
}

const teardown = () => {
    tk.reset()
}

const fastForward = (ms) => {
    tk.travel(new Date(Date.now() + ms))
}

describe('HttpsRedirects', () => {
    describe('main frame redirecting loop protection', () => {
        beforeEach(() => {
            setup()
            httpsRedirects.registerRedirect({
                id: 5,
                url: 'http://example.com',
                type: 'main_frame'
            })
        })

        afterEach(teardown)

        it('should prevent any repeated main frame redirects in the first 3s', () => {
            fastForward(1500)

            let canRedirect = httpsRedirects.canRedirect({
                id: 6,
                url: 'http://example.com',
                type: 'main_frame'
            })

            expect(canRedirect).toEqual(false)
        })
        it('should allow a repeated main frame redirect after 3s', () => {
            fastForward(4500)

            let canRedirect = httpsRedirects.canRedirect({
                id: 6,
                url: 'http://example.com',
                type: 'main_frame'
            })

            expect(canRedirect).toEqual(true)
        })
        it('should let other requests pass', () => {
            fastForward(1500)

            let canRedirect = httpsRedirects.canRedirect({
                id: 6,
                url: 'http://example.test',
                type: 'main_frame'
            })

            expect(canRedirect).toEqual(true, 'it should let other mainframe redirects pass')

            canRedirect = httpsRedirects.canRedirect({
                id: 8,
                url: 'http://example.com/cat.gif',
                type: 'image'
            })

            expect(canRedirect).toEqual(true, 'it should let non-mainframe redirects pass')
        })
        it('once a main frame redirect has been marked as not working, the URL should be blacklisted', () => {
            fastForward(1500)

            let canRedirect = httpsRedirects.canRedirect({
                id: 6,
                url: 'http://example.com',
                type: 'main_frame'
            })

            expect(canRedirect).toEqual(false)

            fastForward(7000)

            canRedirect = httpsRedirects.canRedirect({
                id: 7,
                url: 'http://example.com',
                type: 'main_frame'
            })

            expect(canRedirect).toEqual(false)
        })
    })
    describe('normal request redirect protection', () => {
    })
    describe('getting/persisting the main frame redirect', () => {
    })
})
