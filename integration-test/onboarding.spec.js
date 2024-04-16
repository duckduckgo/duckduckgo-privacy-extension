import { test, expect } from './helpers/playwrightHarness'
import backgroundWait from './helpers/backgroundWait'

test.describe('onboarding', () => {
    test('should manage the onboarding state and inject a script that calls window.onFirstSearchPostExtensionInstall on the first search post extension', async ({ manifestVersion, context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context)

        const params = await backgroundPage.evaluate(() => {
            return {
                showWelcomeBanner: globalThis.dbg.settings.getSetting('showWelcomeBanner'),
                showCounterMessaging: globalThis.dbg.settings.getSetting('showCounterMessaging')
            }
        })

        expect(params.showWelcomeBanner).toBe(true)
        expect(params.showCounterMessaging).toBe(true)

        await page.bringToFront()
        await page.goto('https://duckduckgo.com/?q=hello')

        if (manifestVersion === 2) {
            const hasScriptHandle = await page.waitForFunction(() => {
                const scripts = document.querySelectorAll('script:not([src])')
                return Array.from(scripts).some((s) => s.textContent.includes('window.onFirstSearchPostExtensionInstall'))
            }, { polling: 'mutation' })
            expect(hasScriptHandle).toBeTruthy()
        }

        const nextParams = await backgroundPage.evaluate(() => {
            return {
                showWelcomeBanner: globalThis.dbg.settings.getSetting('showWelcomeBanner'),
                showCounterMessaging: globalThis.dbg.settings.getSetting('showCounterMessaging')
            }
        })

        expect(nextParams.showWelcomeBanner).toBeFalsy()
        expect(nextParams.showCounterMessaging).toBe(true)
    })

    test('should allow the site to perform extension health checks (Chrome only)', async ({ context, page }) => {
        await backgroundWait.forExtensionLoaded(context)

        await page.bringToFront()
        await page.goto('https://duckduckgo.com/?q=hello')

        const data = await page.evaluate(() => {
            return new Promise((resolve) => {
                globalThis.addEventListener('message', (e) => {
                    if (e.origin === globalThis.location.origin && e.data.type === 'healthCheckResponse') {
                        resolve({
                            type: e.data.type,
                            isAlive: e.data.isAlive
                        })
                    }
                })
                globalThis.postMessage({ type: 'healthCheckRequest' }, globalThis.location.origin)
            })
        })

        expect(data.type).toBe('healthCheckResponse')
        expect(data.isAlive).toBe(true)
    })

    test('should allow the site to reschedule the counter messaging (Chrome only)', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context)

        await page.goto('https://duckduckgo.com/?q=hello')

        await page.evaluate(() => {
            globalThis.postMessage({ type: 'rescheduleCounterMessagingRequest' }, globalThis.location.origin)
        })

        await backgroundWait.forSetting(backgroundPage, 'rescheduleCounterMessagingOnStart')
        const rescheduleCounterMessagingOnStart = await backgroundPage.evaluate(() => {
            return globalThis.dbg.settings.getSetting('rescheduleCounterMessagingOnStart')
        })
        expect(rescheduleCounterMessagingOnStart).toBe(true)
    })
})
