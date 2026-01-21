import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';

test('Ensure GPC is injected into pages', async ({ context, page, backgroundPage, manifestVersion }) => {
    await backgroundWait.forExtensionLoaded(context);
    await backgroundWait.forAllConfiguration(backgroundPage);

    // For MV3, wait for content script registration to complete
    if (manifestVersion === 3) {
        await backgroundPage.evaluate(() => {
            return globalThis.components.scriptInjection.ready;
        });
    }

    // Navigate to a real GPC test page
    await page.goto('https://privacy-test-pages.site/privacy-protections/gpc/', { waitUntil: 'networkidle' });

    // Wait for GPC injection and check the value
    await page.waitForFunction(() => 'globalPrivacyControl' in navigator, { timeout: 10000 });
    const gpc = await page.evaluate(() => navigator.globalPrivacyControl);

    expect(gpc).toEqual(true);
});
