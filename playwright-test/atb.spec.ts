import { test, expect, mockAtb } from "./harness";

test.describe('install workflow', () => {
    test("postinstall page: should open the postinstall page correctly", async ({
        context,
        page,
    }) => {
        let postInstallOpened = false;

        // wait for post install page to open
        // if it never does, jasmine timeout will kick in
        while (!postInstallOpened) {
            const urls = await Promise.all(
                context.pages().map((target) => target.url())
            );
            postInstallOpened = urls.some((url) =>
                url.includes("duckduckgo.com/extension-success")
            );
            await page.waitForTimeout(100);
        }

        expect(postInstallOpened).toBeTruthy();
    });

    test.describe('atb values', () => {
        test.beforeEach(async ({ backgroundNetworkContext, backgroundPage }) => {
            // wait for the exti call to go out
            await new Promise<void>(resolve => {
                const extiListener = request => {
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

        test('should get its ATB param from atb.js when there\'s no install success page', async ({ page, backgroundPage, backgroundNetworkContext }) => {
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
            await backgroundPage.evaluate(() => globalThis.dbg.atb.updateATBValues())

            // wait for an exti call
            while (numExtiCalled < 0) {
                page.waitForTimeout(100)
            }

            const atb = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting("atb"));
            const setAtb = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting("set_atb"));
            const extiSent = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting('extiSent'));

            // check the extension's internal state is correct
            expect(atb).toEqual(mockAtb.version)
            expect(setAtb).toEqual(atb);
            expect(extiSent).toBeTruthy();

            expect(numAtbCalled).toEqual(1);
            expect(numExtiCalled).toEqual(1);
        })

        test('should get its ATB param from the success page when one is present', async ({ page, backgroundNetworkContext, backgroundPage }) => {
            let numExtiCalled = 0
            backgroundNetworkContext.on('request', (request) => {
                const url = request.url()
                if (url.match(/exti/)) {
                    numExtiCalled += 1
                    expect(url).toContain(`atb=v123-4`)
                }
            })

            // open a success page and wait for it to have finished loading
            await page.goto('https://duckduckgo.com/?natb=v123-4ab&cp=atbhc', { waitUntil: 'networkidle' })

            // try get ATB params again
            await backgroundPage.evaluate(() => globalThis.dbg.atb.updateATBValues())
            while (numExtiCalled < 0) {
                page.waitForTimeout(100)
            }

            const atb = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting("atb"));
            const setAtb = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting("set_atb"));
            const extiSent = await backgroundPage.evaluate(() => globalThis.dbg.settings.getSetting('extiSent'));

            // check the extension's internal state is correct
            expect(atb).toMatch(/v123-4ab/)
            expect(setAtb).toEqual(atb)
            expect(extiSent).toBeTruthy()
            expect(numExtiCalled).toEqual(1)
        })
    })
})
