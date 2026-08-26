/**
 * The chromium-embedded build serves the New Tab Page (from
 * @duckduckgo/content-scope-scripts) as an extension page, with its messaging
 * bridged to the background over a runtime port (see
 * shared/js/ntp/interop-shim.js and
 * shared/js/background/components/ntp-messaging.js).
 */
import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { isChromiumEmbedded } from './helpers/platform';
import { runRequestBlockingTest } from './helpers/requests';

const trackingTestHost = 'privacy-test-pages.site';
const trackingTestSite = `https://${trackingTestHost}/privacy-protections/request-blocking/`;

function getNtpUrl(backgroundPage) {
    // Note: URL.origin is 'null' for chrome-extension: URLs, so cannot be used here.
    const extensionOrigin = backgroundPage.url().split('/').slice(0, 3).join('/');
    return `${extensionOrigin}/ntp/index.html`;
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

    test('renders the protections widget via extension messaging', async ({ page, backgroundPage }) => {
        await page.goto(getNtpUrl(backgroundPage));

        // the protections widget only renders once initialSetup,
        // protections_getConfig and protections_getData have all round-tripped
        // through the background.
        await expect(page.locator('[data-entry-point="protections"]')).toBeVisible();
    });

    test('shows blocked tracker stats pushed from the background', async ({ page, backgroundPage }) => {
        await page.goto(getNtpUrl(backgroundPage));
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
        await expect(page.getByText('Ad Company', { exact: true })).toBeVisible();
    });

    test('collects per-site activity for the details feed', async ({ page, backgroundPage, context }) => {
        // Browse a page that triggers blocked tracking requests.
        await runRequestBlockingTest(page, trackingTestSite);

        // The visit and its blocked trackers should land in the activity
        // store (blocked-tracker counts are flushed on a 1s throttle).
        await expect
            .poll(
                () =>
                    backgroundPage.evaluate(async (host) => {
                        const rows = await globalThis.components.ntpActivity.store.getAll();
                        return rows.find((row) => row.host === host)?.totalCount || 0;
                    }, trackingTestHost),
                { timeout: 10000 },
            )
            .toBeGreaterThan(0);

        // The details feed on the NTP should show the visited site.
        const ntp = await context.newPage();
        await ntp.goto(getNtpUrl(backgroundPage));
        await expect(ntp.locator('[data-entry-point="protections"]')).toBeVisible();
        await ntp.getByRole('button', { name: 'Details' }).click();
        // one row per site, with the recent page visits listed under it
        await expect(ntp.getByRole('link', { name: trackingTestHost })).toBeVisible();
        await expect(ntp.getByRole('link', { name: 'Request blocking test page' })).toBeVisible();
    });
});
