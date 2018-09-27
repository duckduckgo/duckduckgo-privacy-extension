const HttpsRedirects = require('../../../shared/js/background/classes/https-redirects.es6')
const tk = require('timekeeper')
const pixel = require('../../../shared/js/background/pixel.es6')
let httpsRedirects

/**
 * HELPERS
 */

const setup = () => {
    httpsRedirects = new HttpsRedirects()
    spyOn(pixel, 'fire')
}

let id = 5

const teardown = () => {
    httpsRedirects.resetMainFrameRedirect()
    tk.reset()

    id = 5
}

const fastForward = (ms) => {
    tk.travel(new Date(Date.now() + ms))
}

const getMainFrameRequest = () => {
    id += 1

    return {
        requestId: id,
        type: 'main_frame',
        url: 'http://example.com'
    }
}

const getImageRequest = () => {
    id += 1

    return {
        requestId: id,
        type: 'image',
        url: 'http://example.com/cat.gif'
    }
}

/**
 * TESTS
 */

describe('HttpsRedirects', () => {
    describe('main frame redirecting loop protection', () => {
        beforeEach(() => {
            setup()

            httpsRedirects.registerRedirect(getMainFrameRequest())
        })
        afterEach(teardown)

        it('should allow the first few redirects in the first 3s', () => {
            fastForward(1500)

            let canRedirect

            for (let i = 0; i < 5; i++) {
                httpsRedirects.registerRedirect(getMainFrameRequest())
                canRedirect = httpsRedirects.canRedirect(getMainFrameRequest())
                expect(canRedirect).toEqual(true)
            }
        })
        it('should block a repeated main frame redirect for the same URL after 7 attempts within 3s', () => {
            fastForward(1500)

            for (let i = 0; i < 8; i++) {
                httpsRedirects.registerRedirect(getMainFrameRequest())
            }

            let canRedirect = httpsRedirects.canRedirect(getMainFrameRequest())

            expect(canRedirect).toEqual(false)
        })
        it('should allow repeated main frame redirect after 3s', () => {
            for (let i = 0; i < 5; i++) {
                httpsRedirects.registerRedirect(getMainFrameRequest())
            }

            fastForward(4500)

            for (let i = 0; i < 5; i++) {
                httpsRedirects.registerRedirect(getMainFrameRequest())
            }

            let canRedirect = httpsRedirects.canRedirect(getMainFrameRequest())

            expect(canRedirect).toEqual(true)
        })
        it('should let other requests pass', () => {
            fastForward(1500)

            for (let i = 0; i < 8; i++) {
                httpsRedirects.registerRedirect(getMainFrameRequest())
            }

            let canRedirect = httpsRedirects.canRedirect(getMainFrameRequest())
            expect(canRedirect).toEqual(false)

            let anotherRequest = getMainFrameRequest()
            anotherRequest.url = 'http://example.test'

            canRedirect = httpsRedirects.canRedirect(anotherRequest)
            expect(canRedirect).toEqual(true, 'it should let other mainframe redirects pass')

            anotherRequest = getImageRequest()
            anotherRequest.url = 'http://example.test/cat.gif'

            canRedirect = httpsRedirects.canRedirect(anotherRequest)
            expect(canRedirect).toEqual(true, 'it should let non-mainframe redirects pass')
        })
        it('once a main frame redirect has been marked as not working, the domain should be blacklisted', () => {
            fastForward(1500)

            for (let i = 0; i < 8; i++) {
                httpsRedirects.registerRedirect(getMainFrameRequest())
            }

            let canRedirect = httpsRedirects.canRedirect(getMainFrameRequest())
            expect(canRedirect).toEqual(false)

            fastForward(7000)

            canRedirect = httpsRedirects.canRedirect(getMainFrameRequest())
            expect(canRedirect).toEqual(false)

            canRedirect = httpsRedirects.canRedirect(getImageRequest())
            expect(canRedirect).toEqual(false)

            // different subdomains should still be fine
            let anotherRequest = getImageRequest()
            anotherRequest.url = 'http://www.example.com/cat.gif'

            canRedirect = httpsRedirects.canRedirect(anotherRequest)
            expect(canRedirect).toEqual(true)
        })
    })
    describe('normal request redirect protection', () => {
        beforeEach(setup)
        afterEach(teardown)

        it('should block repeated redirects to non-mainframe requests', () => {
            let canRedirect
            const request = getImageRequest()

            for (let i = 1; i < 10; i += 1) {
                httpsRedirects.registerRedirect(request)
                canRedirect = httpsRedirects.canRedirect(request)

                expect(canRedirect).toEqual(i < 7, 'allow up to 7 redirect attempts for the same request before giving up')
            }
        })

        it('should not allow https redirects for a URL after it\'s failed', () => {
            const request = getImageRequest()

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
