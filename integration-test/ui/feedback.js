const harness = require('../helpers/harness')
const EXAMPLE_URL = `https://example.com/test`

let browser
let bgPage
let feedbackUrl
let feedbackPage

describe('feedback flow', () => {
    beforeAll(async () => {
        ({ browser, bgPage } = await harness.setup())

        const extId = await bgPage.evaluate(() => chrome.runtime.id)

        feedbackUrl = `chrome-extension://${extId}/html/feedback.html`
    })
    afterAll(async () => {
        await harness.teardown(browser)
    })
    beforeEach(async () => {
        feedbackPage = await browser.newPage()

        // make sure running the tests doesn't spam our feedback endpoint
        await feedbackPage.setRequestInterception(true)
        feedbackPage.on('request', async (req) => {
            if (req.url().match(/duckduckgo\.com\/feedback\.js/)) {
                await req.respond({
                    status: 200,
                    contentType: 'text/json',
                    body: '{ "status": "success" }'
                })
            } else {
                await req.continue()
            }
        })
    })
    afterEach(async () => {
        await feedbackPage.close()
    })
    describe('broken site', () => {
        it('should prefill the site if we pass it via the query string', async () => {
            await feedbackPage.goto(`${feedbackUrl}?broken=1&url=${encodeURIComponent(EXAMPLE_URL)}`)

            const val = await feedbackPage.evaluate(() => document.querySelector('.js-feedback-url').value)

            expect(val).toMatch(EXAMPLE_URL)
        })
        it('should be possible to submit after everything has been filled out', async () => {
            await feedbackPage.goto(`${feedbackUrl}?broken=1`)
            await feedbackPage.waitForSelector('.js-feedback-submit')

            // clicking times out for some reason, so we try and enter instead
            // (stolen from https://github.com/GoogleChrome/puppeteer/issues/1805#issuecomment-418965009)
            await feedbackPage.focus('.js-feedback-submit')
            await feedbackPage.keyboard.type('\n')

            let content = await feedbackPage.content()
            expect(content).toContain('js-feedback-submit')
            expect(content).not.toMatch(/thank you/i)

            await feedbackPage.type('.js-feedback-url', EXAMPLE_URL)
            await feedbackPage.type('.js-feedback-message', 'Everything is broken!')

            await feedbackPage.focus('.js-feedback-submit')
            await feedbackPage.keyboard.type('\n')

            await feedbackPage.waitForResponse(r => r.url().match(/feedback\.js/))

            content = await feedbackPage.content()
            expect(content).not.toContain('js-feedback-message')
            expect(content).toMatch(/thank you/i)
        })
    })
    describe('general feedback', () => {
        it('should be possible to submit after everything has been filled out', async () => {
            await feedbackPage.goto(`${feedbackUrl}`)
            await feedbackPage.waitForSelector('.js-feedback-submit')

            await feedbackPage.focus('.js-feedback-submit')
            await feedbackPage.keyboard.type('\n')

            let content = await feedbackPage.content()
            expect(content).toContain('js-feedback-submit')
            expect(content).not.toMatch(/thank you/i)

            await feedbackPage.type('.js-feedback-message', 'Everything is good!')

            await feedbackPage.focus('.js-feedback-submit')
            await feedbackPage.keyboard.type('\n')

            await feedbackPage.waitForResponse(r => r.url().match(/feedback\.js/))

            content = await feedbackPage.content()
            expect(content).not.toContain('js-feedback-message')
            expect(content).toMatch(/thank you/i)
        })
    })
})
