const HttpsRedirects = require('../../../shared/js/background/classes/https-redirects.es6')
const tk = require('timekeeper')
const pixel = require('../../../shared/js/background/pixel.es6')
let httpsRedirects

const setup = () => {
    httpsRedirects = new HttpsRedirects()
    spyOn(pixel, 'fire')
}

const teardown = () => {
    httpsRedirects.resetMainFrameRedirect()
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
                requestId: 5,
                url: 'http://example.com',
                type: 'main_frame'
            })
        })
        afterEach(teardown)

        it('should prevent any repeated main frame redirects in the first 3s', () => {
            fastForward(1500)

            let canRedirect = httpsRedirects.canRedirect({
                requestId: 6,
                url: 'http://example.com',
                type: 'main_frame'
            })

            expect(canRedirect).toEqual(false)
        })
        it('should allow a repeated main frame redirect after 3s', () => {
            fastForward(4500)

            let canRedirect = httpsRedirects.canRedirect({
                requestId: 6,
                url: 'http://example.com',
                type: 'main_frame'
            })

            expect(canRedirect).toEqual(true)
        })
        it('should let other requests pass', () => {
            fastForward(1500)

            let canRedirect = httpsRedirects.canRedirect({
                requestId: 6,
                url: 'http://example.test',
                type: 'main_frame'
            })

            expect(canRedirect).toEqual(true, 'it should let other mainframe redirects pass')

            canRedirect = httpsRedirects.canRedirect({
                requestId: 8,
                url: 'http://example.com/cat.gif',
                type: 'image'
            })

            expect(canRedirect).toEqual(true, 'it should let non-mainframe redirects pass')
        })
        it('once a main frame redirect has been marked as not working, the domain should be blacklisted', () => {
            fastForward(1500)

            let canRedirect = httpsRedirects.canRedirect({
                requestId: 6,
                url: 'http://example.com',
                type: 'main_frame'
            })

            expect(canRedirect).toEqual(false)

            fastForward(7000)

            canRedirect = httpsRedirects.canRedirect({
                requestId: 7,
                url: 'http://example.com',
                type: 'main_frame'
            })

            expect(canRedirect).toEqual(false)

            canRedirect = httpsRedirects.canRedirect({
                requestId: 12,
                url: 'http://example.com/foo/bar.jpg',
                type: 'image'
            })

            expect(canRedirect).toEqual(false)

            // different subdomains should still be fine
            canRedirect = httpsRedirects.canRedirect({
                requestId: 12,
                url: 'http://www.example.com/foo/bar.jpg',
                type: 'image'
            })

            expect(canRedirect).toEqual(true)
        })
    })
    describe('normal request redirect protection', () => {
        beforeEach(setup)
        afterEach(teardown)

        it('should block repeated redirects to non-mainframe requests', () => {
            let canRedirect
            const request = {
                requestId: 102,
                url: 'http://example.com/something/another.js',
                type: 'xhr'
            }

            for (let i = 1; i < 10; i += 1) {
                httpsRedirects.registerRedirect(request)
                canRedirect = httpsRedirects.canRedirect(request)

                expect(canRedirect).toEqual(i < 7, 'allow up to 7 redirect attempts for the same request before giving up')
            }
        })

        it('should not allow https redirects for a URL after it\'s failed', () => {
            const request = {
                requestId: 102,
                url: 'http://example.com/something/another.js',
                type: 'xhr'
            }

            for (let i = 1; i < 10; i += 1) {
                httpsRedirects.registerRedirect(request)
                httpsRedirects.canRedirect(request)
            }

            let canRedirect = httpsRedirects.canRedirect({
                requestId: 105,
                url: 'http://example.com/something/another.js',
                type: 'xhr'
            })

            expect(canRedirect).toEqual(false)
        })

        it('should let other requests through', () => {
            for (let i = 1; i < 10; i += 1) {
                httpsRedirects.registerRedirect({
                    requestId: 102,
                    url: 'http://example.com/something/another.js',
                    type: 'xhr'
                })
            }

            let canRedirect = httpsRedirects.canRedirect({
                requestId: 105,
                url: 'http://example.com/something/completely/different.js',
                type: 'xhr'
            })

            expect(canRedirect).toEqual(true)
        })
    })
    describe('getting/persisting the main frame redirect', () => {
        beforeEach(setup)
        afterEach(teardown)

        it('should be able to dump the main frame redirect', () => {
            httpsRedirects.registerRedirect({
                id: 105,
                url: 'http://example.com',
                type: 'main_frame'
            })
            let redirect = httpsRedirects.getMainFrameRedirect()

            expect(redirect.url).toEqual('http://example.com')
            expect(typeof redirect.time).toEqual('number')
        })
        it('should be able to set a main frame redirect', () => {
            httpsRedirects.registerRedirect({
                id: 105,
                url: 'http://example.com',
                type: 'main_frame'
            })
            httpsRedirects.persistMainFrameRedirect({ url: 'http://example.com', time: Date.now() - 500 })

            let redirect = httpsRedirects.getMainFrameRedirect()
            expect(redirect).toBeTruthy()
            expect(typeof redirect).toEqual('object')
        })
    })
})
