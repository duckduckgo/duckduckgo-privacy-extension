import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { isChromiumEmbedded } from './helpers/platform';

function getNtpUrl(backgroundPage) {
    return backgroundPage.evaluate(() => chrome.runtime.getURL('ntp/index.html'));
}

/**
 * Stops and starts the background service worker over CDP, as Chrome's
 * lifecycle does, without any page messaging it. The backgroundPage handle
 * keeps working across restarts.
 * @param {import('@playwright/test').Page} page - an extension page
 */
async function serviceWorkerControl(page) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('ServiceWorker.enable');
    const reachStatus = (status, command) =>
        new Promise((resolve, reject) => {
            const listener = ({ versions }) => {
                if (versions.some((v) => v.runningStatus === status)) {
                    cdp.off('ServiceWorker.workerVersionUpdated', listener);
                    resolve(undefined);
                }
            };
            cdp.on('ServiceWorker.workerVersionUpdated', listener);
            command().catch(reject);
        });
    return {
        stop: () => reachStatus('stopped', () => cdp.send('ServiceWorker.stopAllWorkers')),
        start: () => reachStatus('running', () => cdp.send('ServiceWorker.startWorker', { scopeURL: new URL('/', page.url()).href })),
    };
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

    test('reconnects to receive stats when the service worker restarts', async ({ page, backgroundPage }) => {
        await page.goto(await getNtpUrl(backgroundPage));
        await expect(page.locator('[data-entry-point="protections"]')).toBeVisible();

        const serviceWorker = await serviceWorkerControl(page);
        await serviceWorker.stop();
        await serviceWorker.start();
        await expect.poll(() => backgroundPage.evaluate(() => globalThis.components?.ntpMessaging?.ports.size).catch(() => 0)).toBe(1);

        await backgroundPage.evaluate(() => {
            globalThis.dbg.ntts.record(3, 'Ad Company');
            globalThis.components.ntpMessaging.pushDataUpdate();
        });
        await expect(page.getByText('3 tracking attempts blocked')).toBeVisible();
    });

    test('re-sends a request left unanswered when the service worker stops', async ({ page, backgroundPage }) => {
        await page.goto(await getNtpUrl(backgroundPage));
        await expect(page.locator('[data-entry-point="protections"]')).toBeVisible();

        await backgroundPage.evaluate(() => {
            globalThis.components.ntpMessaging.handleRequest = () => {
                globalThis.requestReceived = true;
                return new Promise(() => {});
            };
        });
        const response = page.evaluate(
            () =>
                new Promise((resolve) => {
                    globalThis.windowsInteropAddEventListener('message', ({ data }) => {
                        if (data.id === 'unanswered') resolve(data);
                    });
                    globalThis.windowsInteropPostMessage({
                        Feature: 'specialPages',
                        SubFeatureName: 'newTabPage',
                        Name: 'protections_getData',
                        Data: {},
                        Id: 'unanswered',
                    });
                }),
        );
        await expect.poll(() => backgroundPage.evaluate(() => globalThis.requestReceived)).toBe(true);

        // the restarted worker answers the re-sent request
        await (await serviceWorkerControl(page)).stop();
        expect(await response).toEqual(expect.objectContaining({ result: { totalCount: 0 } }));
    });
});
