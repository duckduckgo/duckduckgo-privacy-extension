const harness = require('../helpers/harness')
const backgroundWait = require('../helpers/backgroundWait')
const pageWait = require('../helpers/pageWait')

let browser, bgPage, teardown

describe('onboarding', () => {
    beforeEach(async () => {
        ({ browser, bgPage, teardown } = await harness.setup())
        await backgroundWait.forAllConfiguration(bgPage)
    })

    afterEach(async () => {
        try {
            await teardown()
        } catch (e) {}
    })

    it('should manage the onboarding state and inject a script that calls window.onFirstSearchPostExtensionInstall on the first search post extension', async () => {
        const params = await bgPage.evaluate(() => {
            return {
                showWelcomeBanner: globalThis.dbg.settings.getSetting('showWelcomeBanner'),
                showCounterMessaging: globalThis.dbg.settings.getSetting('showCounterMessaging')
            }
        })

        expect(params.showWelcomeBanner).toBe(true)
        expect(params.showCounterMessaging).toBe(true)

        const page = await browser.newPage()

        await pageWait.forGoto(page, 'https://duckduckgo.com/?q=hello')

        const hasScriptHandle = await page.waitForFunction(() => {
            const scripts = document.querySelectorAll('script:not([src])')
            return Array.from(scripts).some((s) => s.textContent.includes('window.onFirstSearchPostExtensionInstall'))
        }, { polling: 'mutation' })
        expect(hasScriptHandle).toBeTruthy()

        const nextParams = await bgPage.evaluate(() => {
            return {
                showWelcomeBanner: globalThis.dbg.settings.getSetting('showWelcomeBanner'),
                showCounterMessaging: globalThis.dbg.settings.getSetting('showCounterMessaging')
            }
        })

        expect(nextParams.showWelcomeBanner).toBeFalsy()
        expect(nextParams.showCounterMessaging).toBe(true)

        await page.close()
    })

    it('should allow the site to perform extension health checks (Chrome only)', async () => {
        const page = await browser.newPage()

        await pageWait.forGoto(page, 'https://duckduckgo.com/?q=hello')

        // we wait that the onboarding content script is injected
        await page.waitForFunction(() => {
            const scripts = document.querySelectorAll('script:not([src])')
            return Array.from(scripts).some((s) => s.textContent.includes('window.onFirstSearchPostExtensionInstall'))
        }, { polling: 'mutation' })

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

        await page.close()
    })

    it('should allow the site to reschedule the counter messaging (Chrome only)', async () => {
        const page = await browser.newPage()
        await pageWait.forGoto(page, 'https://duckduckgo.com/?q=hello')

        // we wait that the onboarding content script is injected
        await page.waitForFunction(() => {
            const scripts = document.querySelectorAll('script:not([src])')
            return Array.from(scripts).some((s) => s.textContent.includes('window.onFirstSearchPostExtensionInstall'))
        }, { polling: 'mutation' })

        await page.evaluate(() => {
            globalThis.postMessage({ type: 'rescheduleCounterMessagingRequest' }, globalThis.location.origin)
        })

        await backgroundWait.forSetting(bgPage, 'rescheduleCounterMessagingOnStart')
        const rescheduleCounterMessagingOnStart = await bgPage.evaluate(() => {
            return globalThis.dbg.settings.getSetting('rescheduleCounterMessagingOnStart')
        })
        expect(rescheduleCounterMessagingOnStart).toBe(true)

        await page.close()
    })
})
