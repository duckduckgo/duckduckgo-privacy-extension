import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { isChromiumEmbedded } from './helpers/platform';

function getNtpUrl(backgroundPage) {
    return backgroundPage.evaluate(() => chrome.runtime.getURL('ntp/index.html'));
}

test.describe('Embedded New Tab Page', () => {
    test.beforeEach(async ({ backgroundPage }) => {
        test.skip(!isChromiumEmbedded(), 'The New Tab Page is only included in the chromium-embedded build');
        await backgroundWait.forAllConfiguration(backgroundPage);
    });

    test('is registered as the new tab override', async ({ backgroundPage }) => {
        const newtabOverride = await backgroundPage.evaluate(() => chrome.runtime.getManifest().chrome_url_overrides?.newtab);
        expect(newtabOverride).toBe('ntp/index.html');
    });

    test('renders the omnibar, favorites and protections widgets via extension messaging', async ({ page, backgroundPage }) => {
        await page.goto(await getNtpUrl(backgroundPage));

        // each widget only renders once initialSetup and its own
        // getConfig/getData requests have round-tripped through the background.
        await expect(page.locator('[data-entry-point="protections"]')).toBeVisible();
        await expect(page.locator('[data-entry-point="favorites"]')).toBeVisible();
        await expect(page.locator('[data-entry-point="omnibar"]')).toBeVisible();
    });

    test('shows blocked tracker stats pushed from the background', async ({ page, backgroundPage }) => {
        await page.goto(await getNtpUrl(backgroundPage));
        await expect(page.locator('[data-entry-point="protections"]')).toBeVisible();

        // Seed some blocked tracker stats and push the update to the open
        // page, as would happen when trackers are blocked while it's open.
        // Note: only companies in the top-100 (by prevalence) of the loaded
        // TDS are grouped by name - the rest are aggregated into 'other' - so
        // this must be an entity from the mocked TDS the test build loads
        // (integration-test/data/staticcdn/trackerblocking/).
        await backgroundPage.evaluate(() => {
            globalThis.dbg.ntts.record(3, 'Ad Company');
            globalThis.components.ntpMessaging.pushDataUpdate();
        });

        await expect(page.getByText('3 tracking attempts blocked')).toBeVisible();
        // the company breakdown is in the default (privacy-stats) feed
        await expect(page.getByText('Ad Company', { exact: true })).toBeVisible();
    });
});
