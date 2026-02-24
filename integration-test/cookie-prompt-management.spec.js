import { test, expect, getManifestVersion } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { overridePrivacyConfig } from './helpers/testConfig';
import { routeFromLocalhost } from './helpers/testPages';
import { logPixels } from './helpers/pixels';

const autoconsentTestPage = 'https://privacy-test-pages.site/features/autoconsent/';
const bannerTestPage = 'https://privacy-test-pages.site/features/autoconsent/banner.html';
const heuristicTestPage = 'https://privacy-test-pages.site/features/autoconsent/heuristic.html';
const reloadLoopTestPage = 'https://privacy-test-pages.site/features/autoconsent/reload-loop.html';

test.describe('Cookie Prompt Management', () => {
    // CPM is only enabled in the Chrome MV3 build
    if (getManifestVersion() !== 3) {
        return;
    }

    let cleanup;
    const pixelRequests = [];

    test.beforeEach(async ({ context, backgroundPage, backgroundNetworkContext }) => {
        pixelRequests.length = 0;
        cleanup = await logPixels(backgroundPage, backgroundNetworkContext, pixelRequests, (pixel) =>
            pixel.name?.startsWith('autoconsent_'),
        );

        await overridePrivacyConfig(backgroundNetworkContext, 'cookie-prompt-management.json');
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await backgroundWait.forDynamicDNRRulesLoaded(backgroundPage);
        // The CPM content script is only registered when the feature is
        // enabled in remote config. Force a config reload so the overridden config
        // (with autoconsent enabled) triggers content script registration.
        await backgroundPage.evaluate(() => globalThis.components.remoteConfig.checkForUpdates(true));
    });

    test.afterEach(() => {
        if (cleanup) {
            cleanup();
        }
    });

    test('Regular rule clicks the reject button', async ({ page }) => {
        await routeFromLocalhost(page);
        await page.goto(autoconsentTestPage, { waitUntil: 'networkidle' });

        // The autoconsent test page has a button that autoconsent should click.
        // After clicking, the button text changes to "I was clicked!"
        const clickedButton = page.locator('button', { hasText: 'I was clicked!' });
        await expect(clickedButton).toBeVisible({ timeout: 10000 });
    });

    test('Cosmetic rule hides the banner', async ({ page }) => {
        await routeFromLocalhost(page);
        await page.goto(bannerTestPage, { waitUntil: 'networkidle' });

        // Wait for the page to load with the expected content (heading is not hidden by autoconsent)
        await expect(page.locator('text=Tests for cosmetic hiding of cookie banners')).toBeVisible({ timeout: 10000 });

        // The banner text should be hidden by autoconsent cosmetic filtering
        const bannerContent = page.locator('text=This is a fake consent banner without a reject button');
        await expect(bannerContent).toBeHidden({ timeout: 10000 });

        // The pre-hidden element should also be hidden
        const preHiddenElement = page.locator('text=This should be pre-hidden');
        await expect(preHiddenElement).toBeHidden({ timeout: 10000 });
    });

    test('Heuristic mode clicks the reject button', async ({ page }) => {
        await routeFromLocalhost(page);
        await page.goto(heuristicTestPage, { waitUntil: 'networkidle' });

        // Wait for the heuristic test page to load
        await expect(page.locator('text=Tests for heuristic mode')).toBeVisible({ timeout: 10000 });

        // Verify autoconsent heuristic mode clicked the reject button
        const clickedButton = page.locator('button', { hasText: 'Reject was clicked!' });
        await expect(clickedButton).toBeVisible({ timeout: 10000 });
    });

    test('Autoconsent works across multiple page navigations', async ({ page }) => {
        await routeFromLocalhost(page);

        // Page 1: autoclick flow
        await page.goto(autoconsentTestPage, { waitUntil: 'networkidle' });
        const clickedButton = page.locator('button', { hasText: 'I was clicked!' });
        await expect(clickedButton).toBeVisible({ timeout: 10000 });

        // Page 2: banner hiding flow
        await page.goto(bannerTestPage, { waitUntil: 'networkidle' });
        await expect(page.locator('text=Tests for cosmetic hiding of cookie banners')).toBeVisible({ timeout: 10000 });
        const bannerText = page.locator('text=This is a fake consent banner without a reject button');
        await expect(bannerText).toBeHidden({ timeout: 10000 });
    });

    test('Autoconsent persists after page reload', async ({ page }) => {
        await routeFromLocalhost(page);

        // Initial navigation
        await page.goto(autoconsentTestPage, { waitUntil: 'networkidle' });
        const clickedButton = page.locator('button', { hasText: 'I was clicked!' });
        await expect(clickedButton).toBeVisible({ timeout: 10000 });

        // Reload the page
        await page.reload({ waitUntil: 'networkidle' });

        // Verify autoclick persists after reload
        await expect(clickedButton).toBeVisible({ timeout: 10000 });
    });

    test('Reload loop is prevented', async ({ page }) => {
        await routeFromLocalhost(page);
        await page.goto(reloadLoopTestPage, { waitUntil: 'networkidle' });

        // The reload loop test page:
        // 1. First load: autoconsent clicks "Reject all" button
        // 2. Button click triggers location.reload()
        // 3. Second load: autoconsent clicks again, detects a reload loop
        // 4. Third load: autoconsent stops clicking, page stabilizes

        // Wait for the reload cycle to complete and page to stabilize
        await page.waitForTimeout(5000);

        // Verify the page is stable with the reject button still visible (not clicked)
        const pageContent = page.locator('text=CPM reload loop detection');
        await expect(pageContent).toBeVisible();

        const rejectButton = page.locator('button', { hasText: 'Reject all' });
        await expect(rejectButton).toBeVisible();

        // Verify exactly 3 page loads occurred: initial + 2 reloads
        const pageLoadCount = page.locator('text=Page load count: 3');
        await expect(pageLoadCount).toBeVisible();
    });

    test('Fires expected pixels', async ({ page, backgroundPage, backgroundNetworkContext }) => {
        await routeFromLocalhost(page);
        await page.goto(autoconsentTestPage, { waitUntil: 'networkidle' });

        // Wait for autoconsent to handle the popup
        const clickedButton = page.locator('button', { hasText: 'I was clicked!' });
        await expect(clickedButton).toBeVisible({ timeout: 10000 });

        // Verify that at least the init and done pixels were fired.
        // Pixel names include browser suffix, e.g. "autoconsent_init_daily_extension_chrome"
        const pixelNames = pixelRequests.map((p) => p.name);
        expect(pixelNames.some((n) => n.includes('autoconsent_init_daily'))).toBeTruthy();
        expect(pixelNames.some((n) => n.includes('autoconsent_popup-found_daily'))).toBeTruthy();
        expect(pixelNames.some((n) => n.includes('autoconsent_done_daily'))).toBeTruthy();
    });
});
