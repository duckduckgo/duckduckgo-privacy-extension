/**
 *  Test email autofill
 */

/* global dbg:false */
const harness = require('../helpers/harness')
const _sites = require('./input-detection-site-list')

// Add sites to the focusedSites to only execute those
const sites = _sites.focusedSites.length ? _sites.focusedSites : _sites.sites

let browser

describe('Email autofill input detection Tests', () => {
    beforeAll(async () => {
        ({ browser } = await harness.setup())
    })
    afterAll(async () => {
        await harness.teardown(browser)
    })

    sites.forEach(({name, url, autofillExpected, actions}) => {
        it(`Test input field detection on ${name}`, async () => {
            const page = await browser.newPage()
            await page.setViewport({width: 1300, height: 800})
            const ua = await browser.userAgent()
            await page.setUserAgent(ua.replace(/Headless /, ''))

            try {
                await page.goto(`${url}`, { waitUntil: 'networkidle0' })
            } catch (e) {
                // timed out waiting for page to load, let's try running the test anyway
            }

            if (actions) {
                await Promise.all(actions.map(async ({action, selector}) => page[action](arg)))
                    .catch(e => fail(`Action failed on ${name}: ${e.message}.`))
            }

            if (autofillExpected) {
                await page.waitForSelector('[data-ddg-autofill]', {visible: true})
                    .catch(() => fail(`False negative on ${name}.`))
            } else {
                const el = await page.waitForSelector('[data-ddg-autofill]', {visible: true, timeout: 300})
                    .catch(() => null) // the selector is supposed to fail
                if (el) {
                    fail(`False positive on ${name}.`)
                }
            }

            await page.close()
        })
    })
})
