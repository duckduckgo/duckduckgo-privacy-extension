const FeedbackForm = require('../../../shared/js/ui/models/feedback-form.es6')
const browserUIWrapper = require('../../../shared/js/ui/base/$BROWSER-ui-wrapper.es6')

let feedbackForm

function setup () {
    // make sure we always have an atb and extension version handy
    let spy = spyOn(browserUIWrapper, 'fetch')

    spy.withArgs({ getSetting: { name: 'atb' } })
        .and.returnValue(Promise.resolve('v110-1'))

    spy.withArgs({ getExtensionVersion: true })
        .and.returnValue(Promise.resolve('2018.5.1'))

    feedbackForm = new FeedbackForm({
        modelName: Math.random().toString()
    })

    window.$ = { ajax: () => {} }
}

describe('updateCanSubmit', () => {
    beforeEach(setup)

    it('should not allow submitting until message is filled (general feedback)', () => {
        expect(feedbackForm.canSubmit).toBeFalsy()

        feedbackForm.set('message', 'everything is broken')
        feedbackForm.updateCanSubmit()
        expect(feedbackForm.canSubmit).toBeTruthy()
    })
    it('should not allow submitting until all fields are filled (broken site)', () => {
        feedbackForm.set('isBrokenSite', true)
        expect(feedbackForm.canSubmit).toBeFalsy()

        feedbackForm.set('url', 'http://example.com')
        feedbackForm.updateCanSubmit()
        expect(feedbackForm.canSubmit).toBeFalsy()

        feedbackForm.set('message', 'everything is broken')
        feedbackForm.updateCanSubmit()
        expect(feedbackForm.canSubmit).toBeTruthy()
    })
})

describe('toggleBrokenSite', () => {
    beforeEach(setup)

    it('should toggle isBrokenSite correctly', () => {
        expect(feedbackForm.isBrokenSite).toBeFalsy()

        feedbackForm.toggleBrokenSite(true)
        expect(feedbackForm.isBrokenSite).toBeTruthy()

        feedbackForm.toggleBrokenSite(false)
        expect(feedbackForm.isBrokenSite).toBeFalsy()
    })

    it('should reset any fields correctly', () => {
        feedbackForm.set('message', 'everything is broken')

        feedbackForm.toggleBrokenSite(true)

        expect(feedbackForm.message).toBeFalsy()
    })
})

describe('submit', () => {
    let spy

    beforeEach((done) => {
        setup()

        spy = spyOn(window.$, 'ajax')

        feedbackForm.set({
            isBrokenSite: true,
            message: 'hello',
            url: 'http://example.com',
            browser: 'Chrome',
            browserVersion: '60.5'
        })
        feedbackForm.updateCanSubmit()

        // even though we've got spies for the properties we get via fetch,
        // they are retrieved asynchronously - give them some time to resolve
        setTimeout(done, 50)
    })

    it('should pass the correct arguments to the AJAX call', () => {
        feedbackForm.submit()

        let args = spy.calls.argsFor(0)

        expect(args[1].method).toEqual('POST')
        expect(typeof args[1].data).toEqual('object')
        expect(args[1].data.reason).toEqual('broken_site')
        expect(args[1].data.url).toEqual('http://example.com')
        expect(args[1].data.comment).toEqual('hello')
        expect(args[1].data.v).toEqual('2018.5.1')
        expect(args[1].data.browser).toEqual('Chrome')
        expect(args[1].data.browser_version).toEqual('60.5')
    })
})
