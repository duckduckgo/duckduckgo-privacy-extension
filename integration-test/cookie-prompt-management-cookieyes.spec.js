import { test, expect, getManifestVersion } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { overridePrivacyConfig } from './helpers/testConfig';

test.describe('Cookie Prompt Management - CookieYes on hcmuddox.com', () => {
    if (getManifestVersion() !== 3) {
        return;
    }

    test.beforeEach(async ({ context, backgroundPage, backgroundNetworkContext }) => {
        await overridePrivacyConfig(backgroundNetworkContext, 'cookie-prompt-management-cookieyes.json');
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await backgroundWait.forDynamicDNRRulesLoaded(backgroundPage);
        await backgroundPage.evaluate(() => globalThis.components.remoteConfig.checkForUpdates(true));
    });

    test('CookieYes popup on hcmuddox.com is handled by the cookieyes rule', async ({ page }) => {
        test.setTimeout(90000);

        await page.goto('https://hcmuddox.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait for autoconsent to detect and handle the popup.
        // The opt-out sets advertisement:no in the cookieyes-consent cookie.
        await expect(async () => {
            const cookies = await page.evaluate(() => document.cookie);
            expect(cookies).toContain('advertisement:no');
        }).toPass({ timeout: 45000 });

        // Verify the banner is hidden after opt-out
        await expect(page.locator('.cky-consent-container')).toBeHidden({ timeout: 5000 });
    });
});
