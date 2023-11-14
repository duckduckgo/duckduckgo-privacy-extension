import { test, expect, getHARPath } from './helpers/playwrightHarness'
import backgroundWait from './helpers/backgroundWait'
import { overridePrivacyConfig } from './helpers/testConfig'

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
    { url: 'duckduckgo.com', har: getHARPath('duckduckgo.com/homepage.har') },
    { url: 'example.com', har: getHARPath('example.com/example.har') }
]

function testFPValues (values) {
    for (const [name, prop] of Object.entries(values)) {
        expect(prop, `${name}`).toEqual(expectedFingerprintValues[name])
    }
}

test.describe('Fingerprint Defense Tests', () => {
    test.beforeEach(async ({ context }) => {
        await backgroundWait.forExtensionLoaded(context)
    })

    tests.forEach(testCase => {
        test(`${testCase.url} should include anti-fingerprinting code`, async ({ context, page }) => {
            await page.routeFromHAR(testCase.har)
            await page.goto(`https://${testCase.url}`, { waitUntil: 'networkidle' })
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
        })
    })
})

test.describe('First Party Fingerprint Randomization', () => {
    test.beforeEach(async ({ context, backgroundNetworkContext }) => {
        // Override config to remove unprotected sites. This is because fingerprint.js is loaded
        // from localhost by the test runner, so would normally be excluded from protections.
        await overridePrivacyConfig(backgroundNetworkContext, 'fingerprint-protection.json')
        await backgroundWait.forExtensionLoaded(context)
    })

    async function runTest (testCase, page) {
        await page.routeFromHAR(testCase.har)
        await page.goto(`https://${testCase.url}`)
        await page.addScriptTag({ path: 'node_modules/@fingerprintjs/fingerprintjs/dist/fp.js' })

        const fingerprint = await page.evaluate(() => {
            /* global FingerprintJS */
            return (async () => {
                const fp = await FingerprintJS.load()
                return fp.get()
            })()
        })
        return {
            canvas: fingerprint.components.canvas.value,
            plugin: fingerprint.components.plugins.value
        }
    }

    for (const testCase of tests) {
        test(`Fingerprints should not change amongst page loads: ${testCase.url}`, async ({ page }) => {
            const result = await runTest(testCase, page)

            const result2 = await runTest(testCase, page)
            expect(result.canvas).toEqual(result2.canvas)
            expect(result.plugin).toEqual(result2.plugin)
        })
    }

    test('Fingerprints should not match across first parties', async ({ page }) => {
        const canvas = new Set()
        const plugin = new Set()

        for (const testCase of tests) {
            const result = await runTest(testCase, page)

            // Add the fingerprints to a set, if the result doesn't match it won't be added
            canvas.add(JSON.stringify(result.canvas))
            plugin.add(JSON.stringify(result.plugin))
        }

        // Ensure that the number of test pages match the number in the set
        expect(canvas.size).toEqual(tests.length)
        expect(plugin.size).toEqual(1)
    })
})

test.describe('Verify injected script is not visible to the page', () => {
    test.beforeEach(async ({ context }) => {
        await backgroundWait.forExtensionLoaded(context)
    })

    tests.forEach(testCase => {
        test(`sjcl is not exposed to page scope: ${testCase.url}`, async ({ page }) => {
            await page.routeFromHAR(testCase.har)
            await page.goto(`https://${testCase.url}`)

            const sjclVal = await page.evaluate(() => {
                if ('sjcl' in globalThis) {
                    return 'visible'
                } else {
                    return 'invisible'
                }
            })
            expect(sjclVal).toEqual('invisible')
        })
    })
})
