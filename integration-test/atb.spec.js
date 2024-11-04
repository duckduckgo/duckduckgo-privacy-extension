import { test, expect, mockAtb } from './helpers/playwrightHarness'
import backgroundWait, { forSetting } from './helpers/backgroundWait'

test.describe('install workflow', () => {
    test('postinstall page: should open the postinstall page correctly', async ({ context, page }) => {
        // wait for post install page to open
        // we leverage the extension loaded helper, which returns the extension success URL when it is opened
        const postInstallOpened = await backgroundWait.forExtensionLoaded(context)
        const postInstallURL = new URL(postInstallOpened)
        expect(postInstallOpened).toBeTruthy()
        expect(postInstallURL.pathname).toBe('/extension-success')
        expect(postInstallURL.searchParams.has('atb')).toBe(true)
        // This ATB comes from the success page.
        expect(postInstallURL.searchParams.get('atb')).not.toEqual(mockAtb.version)
    })

    test.describe('atb values', () => {
        test.beforeEach(async ({ backgroundNetworkContext, backgroundPage }) => {
            // wait for the exti call to go out
            await new Promise((resolve) => {
                const extiListener = (request) => {
                    if (request.url().match(/exti/)) {
                        resolve()
                        backgroundNetworkContext.off('request', extiListener)
                    }
                }
                backgroundNetworkContext.on('request', extiListener)
            })
            // clear atb settings
            await backgroundPage.evaluate(() => {
                globalThis.dbg.settings.removeSetting('atb')
                globalThis.dbg.settings.removeSetting('set_atb')
                globalThis.dbg.settings.removeSetting('extiSent')
            })
        })

        test("should get its ATB param from atb.js when there's no install success page", async ({
            page,
            backgroundPage,
            backgroundNetworkContext,
        }) => {
            // listen for outgoing atb and exti calls
            let numAtbCalled = 0
            let numExtiCalled = 0
            backgroundNetworkContext.on('request', (request) => {
                const url = request.url()
                if (url.match(/atb\.js/)) {
                    numAtbCalled += 1
                } else if (url.match(/exti/)) {
                    numExtiCalled += 1
                    expect(url).toContain(`atb=${mockAtb.version}`)
                }
            })

            // try get ATB params
            await backgroundPage.evaluate(async () => globalThis.dbg.atb.updateATBValues(await globalThis.dbg.Wrapper.getDDGTabUrls()))

            // wait for an exti call
            // eslint-disable-next-line no-unmodified-loop-condition
            while (numExtiCalled < 0) {
                page.waitForTimeout(100)
            }

            const atb = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting('atb'))
            const setAtb = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting('set_atb'))
            const extiSent = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting('extiSent'))

            // check the extension's internal state is correct
            expect(atb).toEqual(mockAtb.version)
            expect(setAtb).toEqual(atb)
            expect(extiSent).toBeTruthy()

            expect(numAtbCalled).toEqual(1)
            expect(numExtiCalled).toEqual(1)
        })

        test('should get its ATB param from the success page when one is present', async ({
            page,
            backgroundNetworkContext,
            backgroundPage,
        }) => {
            let numExtiCalled = 0
            backgroundNetworkContext.on('request', (request) => {
                const url = request.url()
                if (url.match(/exti/)) {
                    numExtiCalled += 1
                    expect(url).toContain('atb=v123-4')
                }
            })

            // open a success page and wait for it to have finished loading
            await page.goto('https://duckduckgo.com/?natb=v123-4ab&cp=atbhc', { waitUntil: 'networkidle' })

            // try get ATB params again
            await backgroundPage.evaluate(async () => globalThis.dbg.atb.updateATBValues(await globalThis.dbg.Wrapper.getDDGTabUrls()))
            // eslint-disable-next-line no-unmodified-loop-condition
            while (numExtiCalled < 0) {
                page.waitForTimeout(100)
            }

            const atb = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting('atb'))
            const setAtb = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting('set_atb'))
            const extiSent = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting('extiSent'))

            // check the extension's internal state is correct
            expect(atb).toMatch(/v123-4ab/)
            expect(setAtb).toEqual(atb)
            expect(extiSent).toBeTruthy()
            expect(numExtiCalled).toEqual(1)
        })
    })

    test.skip('atb storage should retreive stored ATB value on reload', async ({ manifestVersion, context, backgroundPage }) => {
        if (manifestVersion === 3) {
            return
        }
        await backgroundWait.forExtensionLoaded(context)
        // set an ATB value from the past
        const pastATBValue = 'v123-1'
        await backgroundPage.evaluate((pagePastATBValue) => globalThis.dbg.settings.updateSetting('atb', pagePastATBValue), pastATBValue)
        // Reload background
        // FIXME - Will not work for MV3, switch to browser.runtime.reload()?
        await backgroundPage.evaluate(() => globalThis.location.reload())
        await backgroundWait.forSetting(backgroundPage, 'extiSent')
        const atb = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting('atb'))
        expect(atb).toEqual(pastATBValue)
    })
})

test.describe('search workflow', () => {
    let todaysAtb
    let lastWeeksAtb
    let twoWeeksAgoAtb

    test.beforeAll(async ({ context }) => {
        // grab current atb data
        let data = await fetch('https://duckduckgo.com/atb.js')
        data = await data.json()
        todaysAtb = data.version
        lastWeeksAtb = `v${data.majorVersion - 1}-${data.minorVersion}`
        twoWeeksAgoAtb = `v${data.majorVersion - 2}-${data.minorVersion}`

        mockAtb.version = data.version
        mockAtb.majorVersion = data.majorVersion
        mockAtb.minorVersion = data.minorVersion
    })

    test.beforeEach(async ({ backgroundPage, context }) => {
        await backgroundWait.forExtensionLoaded(context)
        await forSetting(backgroundPage, 'atb')
        await backgroundPage.evaluate((atb) => globalThis.dbg.settings.updateSetting('atb', atb), twoWeeksAgoAtb)
    })

    test('should not update set_atb if a repeat search is made on the same day', async ({ backgroundPage, page }) => {
        // set set_atb to today's version
        await backgroundPage.evaluate((pageTodaysAtb) => globalThis.dbg.settings.updateSetting('set_atb', pageTodaysAtb), todaysAtb)

        // run a search
        await page.goto('https://duckduckgo.com/?q=test', { waitUntil: 'networkidle' })

        const newSetAtb = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting('set_atb'))
        const atb = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting('atb'))
        expect(newSetAtb).toEqual(todaysAtb)
        expect(atb).toEqual(twoWeeksAgoAtb)
    })

    test('should update set_atb if a repeat search is made on a different day', async ({ backgroundPage, page }) => {
        // set set_atb to an older version
        await backgroundPage.evaluate(
            (pageLastWeeksAtb) => globalThis.dbg.settings.updateSetting('set_atb', pageLastWeeksAtb),
            lastWeeksAtb,
        )
        // run a search
        await page.goto('https://duckduckgo.com/?q=test', { waitUntil: 'networkidle' })

        await forSetting(backgroundPage, 'set_atb')
        const newSetAtb = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting('set_atb'))
        const atb = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting('atb'))
        expect(newSetAtb).toEqual(todaysAtb)
        expect(atb).toEqual(twoWeeksAgoAtb)
    })

    test('should update atb if the server passes back updateVersion', async ({ backgroundPage, page }) => {
        // set set_atb and atb to older versions
        await backgroundPage.evaluate(
            (pageLastWeeksAtb) => globalThis.dbg.settings.updateSetting('set_atb', pageLastWeeksAtb),
            lastWeeksAtb,
        )
        await backgroundPage.evaluate(() => globalThis.dbg.settings.updateSetting('atb', 'v123-6'))

        // run a search
        await page.goto('https://duckduckgo.com/?q=test', { waitUntil: 'networkidle' })

        await forSetting(backgroundPage, 'set_atb')
        const newSetAtb = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting('set_atb'))
        const atb = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting('atb'))
        expect(newSetAtb).toEqual(todaysAtb)
        expect(atb).toEqual('v123-1')
    })
})
