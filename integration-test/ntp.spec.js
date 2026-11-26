import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { isChromiumEmbedded } from './helpers/platform';
import { routeFromLocalhost } from './helpers/testPages';
import { runRequestBlockingTest } from './helpers/requests';
import { serviceWorkerControl } from './helpers/serviceWorker';

function getNtpUrl(backgroundPage) {
    return backgroundPage.evaluate(() => chrome.runtime.getURL('ntp/index.html'));
}

test.describe('Embedded New Tab Page', () => {
    test.beforeEach(async ({ backgroundPage }) => {
        test.skip(!isChromiumEmbedded(), 'The New Tab Page is only included in the chromium-embedded build');
        await backgroundWait.forAllConfiguration(backgroundPage);
        // Stands in for the DuckDuckGo browser's favorites, which Chrome lacks.
        await backgroundPage.evaluate(() => {
            chrome.ddg = { getFavorites: async () => [] };
        });
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

    test('lists visited sites with their pages and blocked trackers in the details feed', async ({ page, backgroundPage }) => {
        await routeFromLocalhost(page);
        await runRequestBlockingTest(page, 'https://privacy-test-pages.site/privacy-protections/request-blocking/');

        await page.goto(await getNtpUrl(backgroundPage));
        await page.getByRole('tab', { name: 'Details' }).click();
        const site = page.getByTestId('ActivityItem').filter({ hasText: 'privacy-test-pages.site' });
        await expect(site.getByRole('link', { name: 'Request blocking test page' })).toBeVisible();
        await expect(site.getByText(/\d+ tracking attempts blocked/i)).toBeVisible();

        await site.getByRole('button', { name: 'Remove privacy-test-pages.site from history' }).click();
        await expect(site).toHaveCount(0);
        await expect.poll(() => backgroundPage.evaluate(async () => (await globalThis.components.ntpActivity.getSites()).size)).toBe(0);
    });

    test('receives stats pushed after the service worker restarts', async ({ page, backgroundPage }) => {
        await page.goto(await getNtpUrl(backgroundPage));
        await expect(page.locator('[data-entry-point="protections"]')).toBeVisible();

        const serviceWorker = await serviceWorkerControl(page, backgroundPage);
        await serviceWorker.stop();
        await serviceWorker.start();

        await backgroundPage.evaluate(() => {
            globalThis.dbg.ntts.record(3, 'Ad Company');
            globalThis.components.ntpMessaging.pushDataUpdate();
        });
        await expect(page.getByText('3 tracking attempts blocked')).toBeVisible();
    });
});
