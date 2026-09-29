import { test, expect } from './helpers/playwrightHarness';
import { forAllConfiguration, forExtensionLoaded, forDynamicDNRRulesLoaded } from './helpers/backgroundWait';
import { routeFromLocalhost } from './helpers/testPages';
import { runRequestBlockingTest } from './helpers/requests';
import { getPlatform } from './helpers/platform';

const testSite = 'https://privacy-test-pages.site/privacy-protections/request-blocking/';

/**
 * Turn on "Allow in Incognito" for the extension through chrome://extensions.
 * Developer mode has to be enabled first, otherwise Chromium disables the
 * unpacked extension when the setting change reloads it.
 *
 * @param {import('@playwright/test').BrowserContext} context
 * @param {import('@playwright/test').Worker} backgroundPage
 * @returns {Promise<import('@playwright/test').Worker>} the reloaded extension's background ServiceWorker
 */
async function allowIncognito(context, backgroundPage) {
    const extensionId = new URL(backgroundPage.url()).host;
    const page = await context.newPage();
    await page.goto('chrome://extensions/');
    await page.locator('#devMode').click();
    await page.goto(`chrome://extensions/?id=${extensionId}`);
    const reloadedBackground = context.waitForEvent('serviceworker');
    await page.locator('#allow-incognito').click();
    await page.close();
    return reloadedBackground;
}

/**
 * @param {import('@playwright/test').Worker} backgroundPage
 */
async function waitForExtensionReady(backgroundPage) {
    await expect.poll(() => backgroundPage.evaluate(() => !!globalThis.dbg?.settings).catch(() => false)).toBe(true);
    await forAllConfiguration(backgroundPage);
    await forDynamicDNRRulesLoaded(backgroundPage);
}

/**
 * Stats that are persisted to extension storage.
 * @param {import('@playwright/test').Worker} backgroundPage
 */
function getPersistedStats(backgroundPage) {
    return backgroundPage.evaluate(async () => {
        const { companies } = globalThis.dbg;
        const { trackerStats } = await chrome.storage.local.get('trackerStats');
        return {
            totalPages: companies.getTotalPages(),
            companies: Object.fromEntries(
                companies.all().map((name) => [name, { count: companies.get(name).count, pagesSeenOn: companies.get(name).pagesSeenOn }]),
            ),
            newTabTrackerCount: trackerStats?.stats.totalCount ?? 0,
        };
    });
}

/**
 * Load the request blocking test page in a new tab and return the extension's view of that tab.
 * @param {import('@playwright/test').BrowserContext} context
 * @param {import('@playwright/test').Worker} backgroundPage
 * @param {boolean} incognito
 */
async function runInNewTab(context, backgroundPage, incognito) {
    const pagePromise = context.waitForEvent('page');
    await backgroundPage.evaluate(async (inIncognito) => {
        if (inIncognito) {
            await chrome.windows.create({ incognito: true });
        } else {
            await chrome.tabs.create({});
        }
    }, incognito);
    const page = await pagePromise;
    await routeFromLocalhost(page);
    await runRequestBlockingTest(page, testSite);

    const result = await backgroundPage.evaluate(async (inIncognito) => {
        const tabs = await chrome.tabs.query({ url: 'https://privacy-test-pages.site/*' });
        const tab = tabs.find((t) => t.incognito === inIncognito);
        const extensionTab = globalThis.dbg.tabManager.get({ tabId: tab.id });
        return {
            browserIncognito: tab.incognito,
            extensionIncognito: extensionTab.incognito,
            trackers: Object.keys(extensionTab.trackers),
        };
    }, incognito);
    await page.close();
    return result;
}

test.describe('Incognito tracker stats', () => {
    test.skip(getPlatform() !== 'chrome', 'Toggles incognito access through chrome://extensions');

    test('blocks trackers in incognito tabs without adding them to the persisted stats', async ({ context, backgroundPage }) => {
        test.slow();
        await forExtensionLoaded(context);
        await waitForExtensionReady(backgroundPage);
        backgroundPage = await allowIncognito(context, backgroundPage);
        await waitForExtensionReady(backgroundPage);

        const initialStats = await getPersistedStats(backgroundPage);

        const incognitoTab = await runInNewTab(context, backgroundPage, true);
        expect(incognitoTab.browserIncognito).toBe(true);
        expect(incognitoTab.extensionIncognito).toBe(true);
        // Trackers are still blocked and shown in the dashboard for the tab
        expect(incognitoTab.trackers).toContain('Test Site for Tracker Blocking');
        // Give the throttled new tab stats sync a chance to run
        await new Promise((resolve) => setTimeout(resolve, 1500));
        expect(await getPersistedStats(backgroundPage)).toEqual(initialStats);

        // The same page in a normal tab does update the stats
        const normalTab = await runInNewTab(context, backgroundPage, false);
        expect(normalTab.browserIncognito).toBe(false);
        expect(normalTab.extensionIncognito).toBe(false);
        await expect
            .poll(() => getPersistedStats(backgroundPage).then((stats) => stats.newTabTrackerCount))
            .toBeGreaterThan(initialStats.newTabTrackerCount);
        const finalStats = await getPersistedStats(backgroundPage);
        expect(finalStats.companies['Test Site for Tracker Blocking']?.count).toBeGreaterThan(0);
    });
});
