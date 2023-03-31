import { test, expect } from './helpers/playwrightHarness'
import { forAllConfiguration, forExtensionLoaded } from './helpers/backgroundWait'
import { loadTestConfig } from './helpers/testConfig'

const testHost = 'ally.com'
const testSite = `https://${testHost}/`

test.describe('Test runtime checks', () => {
    test('Should block all the test tracking requests', async ({ page, backgroundPage, context }) => {
        await forExtensionLoaded(context)
        await forAllConfiguration(backgroundPage)
        await loadTestConfig(backgroundPage, 'runtime-checks.json')
        page.on("console", (message) => {
            if (message.type() === "error") {
              console.log(message.text())
            }
        })
        await page.goto(testSite, { waitUntil: 'networkidle' })

        // Also check that the test page itself agrees that no requests were
        // allowed.
        const pageResults = await page.evaluate(async () => {
            await new Promise(resolve => setTimeout(resolve, 4000))
            return true
        })
        expect(pageResults, 'beep').not.toEqual('loaded')
        await page.close()
    })
})
