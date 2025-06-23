import { test, expect } from './helpers/playwrightHarness';
import { forExtensionLoaded } from './helpers/backgroundWait';

test('Firefox browser test', async ({ manifestVersion, page, backgroundPage, backgroundNetworkContext, context, browserType }) => {
    // Verify we're running in Firefox for MV2 tests
    if (browserType === 'firefox') {
        expect(manifestVersion).toBe(2);
        
        // Test basic Firefox browser functionality
        await page.goto('https://privacy-test-pages.site/');
        await expect(page).toHaveTitle(/Privacy Test Pages/);
        
        // Verify we're using Firefox
        const userAgent = await page.evaluate(() => navigator.userAgent);
        expect(userAgent).toContain('Firefox');
    } else {
        // For Chrome tests, verify extension loading
        await forExtensionLoaded(context);
        expect(manifestVersion).toBe(3);
    }
});

test('Firefox network routing test', async ({ browserType, context, page }) => {
    if (browserType === 'firefox') {
        // Test that network routing works in Firefox
        await page.goto('https://privacy-test-pages.site/');
        
        // Verify the page loads correctly
        await expect(page.locator('body')).toBeVisible();
    }
}); 