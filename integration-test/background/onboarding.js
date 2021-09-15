const harness = require('../helpers/harness')
const wait = require('../helpers/wait')

let browser, bgPage

describe('onboarding', () => {
    beforeEach(async () => {
        ({ browser, bgPage } = await harness.setup())

        await wait.forSetting(bgPage, 'showWelcomeBanner')
        await wait.forSetting(bgPage, 'showCounterMessaging')
    })

    afterEach(async () => {
        try {
            await harness.teardown(browser)
        } catch (e) {}
    })

    it('should manage the onboarding state and inject a script that calls window.onFirstSearchPostExtensionInstall on the first search post extension', async () => {
        const params = await bgPage.evaluate(() => {
            return {
                showWelcomeBanner: window.dbg.settings.getSetting('showWelcomeBanner'),
                showCounterMessaging: window.dbg.settings.getSetting('showCounterMessaging')
            }
        })

        expect(params.showWelcomeBanner).toBe(true)
        expect(params.showCounterMessaging).toBe(true)

        const page = await browser.newPage()

        await page.goto(
            'https://duckduckgo.com/?q=hello',
            { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] }
        )

        const hasScriptHandle = await page.waitForFunction(() => {
            const scripts = document.querySelectorAll('script:not([src])')
            return Array.from(scripts).some((s) => s.textContent.includes('window.onFirstSearchPostExtensionInstall'))
        }, { polling: 'mutation' })
        expect(hasScriptHandle).toBeTruthy()

        const nextParams = await bgPage.evaluate(() => {
            return {
                showWelcomeBanner: window.dbg.settings.getSetting('showWelcomeBanner'),
                showCounterMessaging: window.dbg.settings.getSetting('showCounterMessaging')
            }
        })

        expect(nextParams.showWelcomeBanner).toBeFalsy()
        expect(nextParams.showCounterMessaging).toBe(true)

        await page.close()
    })

    it('should allow the site to perform extension health checks (Chrome only)', async () => {
        const page = await browser.newPage()

        await page.goto(
            'https://duckduckgo.com/?q=hello',
            { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] }
        )

        // we wait that the onboarding content script is injected
        await page.waitForFunction(() => {
            const scripts = document.querySelectorAll('script:not([src])')
            return Array.from(scripts).some((s) => s.textContent.includes('window.onFirstSearchPostExtensionInstall'))
        }, { polling: 'mutation' })

        const data = await page.evaluate(() => {
            return new Promise((resolve) => {
                window.addEventListener('message', (e) => {
                    if (e.origin === window.location.origin && e.data.type === 'healthCheckResponse') {
                        resolve({
                            type: e.data.type,
                            isAlive: e.data.isAlive,
                            data: e.data.data
                        })
                    }
                })
                window.postMessage({ type: 'healthCheckRequest' }, window.location.origin)
            })
        })

        expect(data.type).toBe('healthCheckResponse')
        expect(data.error).toBe(undefined)
        expect(data.isAlive).toBe(true)

        await page.close()
    })

    it('should allow the site to reschedule the counter messaging (Chrome only)', async () => {
        const page = await browser.newPage()
        await page.goto(
            'https://duckduckgo.com/?q=hello',
            { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] }
        )

        // we wait that the onboarding content script is injected
        await page.waitForFunction(() => {
            const scripts = document.querySelectorAll('script:not([src])')
            return Array.from(scripts).some((s) => s.textContent.includes('window.onFirstSearchPostExtensionInstall'))
        }, { polling: 'mutation' })

        await page.evaluate(() => {
            window.postMessage({ type: 'rescheduleCounterMessagingRequest' }, window.location.origin)
        })

        await wait.forSetting(bgPage, 'rescheduleCounterMessagingOnStart')
        const rescheduleCounterMessagingOnStart = await bgPage.evaluate(() => {
            return window.dbg.settings.getSetting('rescheduleCounterMessagingOnStart')
        })
        expect(rescheduleCounterMessagingOnStart).toBe(true)

        await page.close()
    })
})
