/**
 *  Tests for fingerprint defenses. Ensure that fingerprinting is actually being blocked.
 */

const harness = require('../helpers/harness')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')

let browser
let bgPage
let teardown

const expectedFingerprintValues = {
    availTop: 0,
    availLeft: 0,
    wAvailTop: 0,
    wAvailLeft: 0,
    colorDepth: 24,
    pixelDepth: 24,
    productSub: '20030107',
    vendorSub: ''
}

const tests = [
    { url: 'wikipedia.com' },
    { url: 'example.com' }
]

function testFPValues (values) {
    for (const [name, prop] of Object.entries(values)) {
        expect(prop).withContext(`${name}`).toEqual(expectedFingerprintValues[name])
    }
}

describe('Fingerprint Defense Tests', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)
    })
    afterAll(async () => {
        await teardown()
    })

    tests.forEach(test => {
        it(`${test.url} should include anti-fingerprinting code`, async () => {
            const page = await browser.newPage()
            const ua = await browser.userAgent()
            await page.setUserAgent(ua.replace(/Headless /, ''))

            await pageWait.forGoto(page, `http://${test.url}`)
            const values = await page.evaluate(() => {
                return {
                    availTop: screen.availTop,
                    availLeft: screen.availLeft,
                    wAvailTop: globalThis.screen.availTop,
                    wAvailLeft: globalThis.screen.availLeft,
                    colorDepth: screen.colorDepth,
                    pixelDepth: screen.pixelDepth,
                    productSub: navigator.productSub,
                    vendorSub: navigator.vendorSub
                }
            })
            testFPValues(values)

            await page.close()
        })
    })
})

describe('First Party Fingerprint Randomization', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)
    })
    afterAll(async () => {
        await teardown()
    })

    async function runTest (test) {
        const page = await browser.newPage()

        await pageWait.forGoto(page, `http://${test.url}`)

        await page.addScriptTag({ path: 'node_modules/@fingerprintjs/fingerprintjs/dist/fp.js' })

        const fingerprint = await page.evaluate(() => {
            /* global FingerprintJS */
            return (async () => {
                const fp = await FingerprintJS.load()
                return fp.get()
            })()
        })

        await page.close()

        return {
            canvas: fingerprint.components.canvas.value,
            plugin: fingerprint.components.plugins.value
        }
    }

    for (const testCase of tests) {
        it('Fingerprints should not change amongst page loads', async () => {
            const result = await runTest(testCase)

            const result2 = await runTest(testCase)
            expect(result.canvas).toEqual(result2.canvas)
            expect(result.plugin).toEqual(result2.plugin)
        })
    }

    it('Fingerprints should not match across first parties', async () => {
        const canvas = new Set()
        const plugin = new Set()

        for (const testCase of tests) {
            const result = await runTest(testCase)

            // Add the fingerprints to a set, if the result doesn't match it won't be added
            canvas.add(JSON.stringify(result.canvas))
            plugin.add(JSON.stringify(result.plugin))
        }

        // Ensure that the number of test pages match the number in the set
        expect(canvas.size).toEqual(tests.length)
        expect(plugin.size).toEqual(1)
    })
})

describe('Verify injected script is not visible to the page', () => {
    beforeAll(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)
    })
    afterAll(async () => {
        await teardown()
    })

    tests.forEach(test => {
        it('Fingerprints should not match across first parties', async () => {
            const page = await browser.newPage()

            await pageWait.forGoto(page, `http://${test.url}`)

            const sjclVal = await page.evaluate(() => {
                if ('sjcl' in globalThis) {
                    return 'visible'
                } else {
                    return 'invisible'
                }
            })

            await page.close()

            expect(sjclVal).toEqual('invisible')
        })
    })
})
