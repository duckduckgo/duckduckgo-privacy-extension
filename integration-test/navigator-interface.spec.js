import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { TEST_SERVER_ORIGIN } from './helpers/testPages';

test.describe('navigatorInterface', () => {
    test('injects navigator.duckduckgo interface into pages', async ({ backgroundPage, page, context, manifestVersion }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        if (manifestVersion === 3) {
            // wait for content-script registration to complete
            await backgroundPage.evaluate(() => {
                return globalThis.components.scriptInjection.ready;
            });
        }
        await page.goto('https://privacy-test-pages.site/features/navigator-interface.html');

        // Ensure the test page's detection code runs after the content script
        // injects navigator.duckduckgo. Otherwise, the race condition causes
        // the test to fail occasionally.
        await page.waitForFunction(() => 'duckduckgo' in navigator);
        await page.evaluate(() => window.detectInterface());

        expect(await page.locator('#interface').innerText()).toBe('interface: true');
        expect(await page.locator('#isDuckDuckGo').innerText()).toBe('isDuckDuckGo: true');
        expect(await page.locator('#platform').innerText()).toBe('platform: extension');
    });

    test('does not inject into localhost', async ({ page, context }) => {
        await backgroundWait.forExtensionLoaded(context);
        await page.goto(`${TEST_SERVER_ORIGIN}/features/navigator-interface.html`);
        expect(await page.locator('#interface').innerText()).toBe('interface: false');
        expect(await page.locator('#isDuckDuckGo').innerText()).toBe('isDuckDuckGo: false');
    });
});
