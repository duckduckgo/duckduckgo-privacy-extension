/**
 *  Test autofill
 */

const harness = require('../helpers/harness')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')
const _sites = require('./input-detection-site-list')

// Add sites to the focusedSites to only execute those
const sites = _sites.focusedSites.length ? _sites.focusedSites : _sites.sites

let browser
let bgPage
let teardown

describe('Autofill input detection Tests', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)

        // Sign in in the extension
        const page = await browser.newPage()
        await pageWait.forGoto(page, 'https://duckduckgo.com')
        await page.evaluate(() =>
            window.postMessage({ addUserData: { userName: '', token: '' } }, window.origin)
        )
        await page.close()
    })
    afterAll(async () => {
        await teardown()
    })

    sites.forEach(({ name, url, autofillExpected, actions }) => {
        it(`Test input field detection on ${name} at ${url}`, async () => {
            const page = await browser.newPage()
            await page.setViewport({ width: 1300, height: 800 })
            const ua = await browser.userAgent()
            await page.setUserAgent(ua.replace(/Headless /, '') + ' test')

            await pageWait.forGoto(page, `${url}`)

            if (actions) {
                for (const action of actions) {
                    await page[action.action](action.arg)
                        .catch(e => !action.optional && fail(`Action ${action.action} failed on ${name}: ${e.message}.`))
                    // Wait a bit to give it time to execute. If you need more, add an explicit waitFor action
                    await backgroundWait.forTimeout(bgPage, 750)
                }
            }

            if (autofillExpected) {
                await page.waitForSelector('[data-ddg-autofill]')
                    .catch(() => fail(`False negative on ${name}.`))
                if (autofillExpected > 1) {
                    await page.waitForSelector('input')
                        .catch(() => fail(`Couldn't find an input on ${name}. Maybe the page didn't load.`))
                    await page.$$('[data-ddg-autofill]')
                        .then(nodes => {
                            if (nodes.length < autofillExpected) {
                                fail(`Expected ${autofillExpected} elements, but got ${nodes.length}.`)
                            }
                        })
                }
            } else {
                await page.waitForSelector('input')
                    .catch(() => fail(`Couldn't find an input on ${name}. Maybe the page didn't load.`))
                const el = await page.waitForSelector('[data-ddg-autofill]', { visible: true, timeout: 600 })
                    .catch(() => null) // the selector is supposed to fail
                if (el) {
                    fail(`False positive on ${name}.`)
                }
            }

            await page.close()
        })
    })
})
