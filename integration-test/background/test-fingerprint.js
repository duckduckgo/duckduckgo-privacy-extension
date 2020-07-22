/**
 *  Tests for fingerprint defenses. Ensure that fingerprinting is actually being blocked.
 */

/* global dbg:false */
const harness = require('../helpers/harness')

let browser
let bgPage

const expectedFingerprintValues = {
    availTop: 0,
    availLeft: 0,
    wAvailTop: 0,
    wAvailLeft: 0,
    colorDepth: 24,
    pixelDepth: 24,
    doNotTrack: null,
    productSub: '20030107',
    vendorSub: ''
}

const tests = [
    {url: 'wikipedia.com'},
    {url: 'reddit.com'}
]

function testFPValues (values) {
    for (const [name, prop] of Object.entries(values)) {
        expect(prop).withContext(`${name}`).toEqual(expectedFingerprintValues[name])
    }
}

describe('Fingerprint Defense Tests', () => {
    beforeAll(async () => {
        ({ browser, bgPage } = await harness.setup())

        // wait for HTTPs to successfully load
        await bgPage.waitForFunction(
            () => window.dbg && dbg.https.isReady,
            { polling: 100, timeout: 60000 }
        )
    })
    afterAll(async () => {
        await harness.teardown(browser)
    })

    tests.forEach(test => {
        it(`${test.url} should include anti-fingerprinting code`, async () => {
            const page = await browser.newPage()
            const ua = await browser.userAgent()
            await page.setUserAgent(ua.replace(/Headless /, ''))

            try {
                await page.goto(`http://${test.url}`, { waitUntil: 'networkidle0' })
            } catch (e) {
                // timed out waiting for page to load, let's try running the test anyway
            }
            // give it another second just to be sure
            await page.waitFor(1000)
            const values = await page.evaluate(() => {
                return {
                    availTop: screen.availTop,
                    availLeft: screen.availLeft,
                    wAvailTop: window.screen.availTop,
                    wAvailLeft: window.screen.availLeft,
                    colorDepth: screen.colorDepth,
                    pixelDepth: screen.pixelDepth,
                    doNotTrack: navigator.doNotTrack,
                    productSub: navigator.productSub,
                    vendorSub: navigator.vendorSub
                }
            })
            testFPValues(values)

            await page.close()
        })
    })
})
