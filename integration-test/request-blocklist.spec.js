import { test, expect, isFirefoxTest } from './helpers/playwrightHarness';
import { forAllConfiguration, forExtensionLoaded, forDynamicDNRRulesLoaded } from './helpers/backgroundWait';
import { overridePrivacyConfig, overrideTds } from './helpers/testConfig';
import { runRequestBlockingTest } from './helpers/requests';

const testHost = 'privacy-test-pages.site';
const testSite = `https://${testHost}/privacy-protections/request-blocking/`;

function expectBlocked(protectionsEnabled, url) {
    return protectionsEnabled && new URL(url).pathname.endsWith('.jpg');
}

test.describe('Test Request Blocklist feature', () => {
    // Firefox: Skip tests that need TDS/config override. The RDP evaluate mechanism
    // can't reliably handle data larger than ~500 bytes.
    // TODO: Find a way to bundle test data in the extension build for Firefox.
    test.skip(isFirefoxTest(), 'Firefox: RDP cannot handle large TDS/config data');

    test('Should block the .jpg requests', async ({ page, backgroundPage, context, backgroundNetworkContext, manifestVersion }) => {
        await overrideTds(backgroundNetworkContext, 'empty-tds.json');
        await overridePrivacyConfig(backgroundNetworkContext, 'request-blocklist.json');
        await forExtensionLoaded(context);
        await forAllConfiguration(backgroundPage);
        if (manifestVersion === 3) {
            await forDynamicDNRRulesLoaded(backgroundPage);
        }

        for (const protectionsEnabled of [true, false]) {
            // Disable protections after the first time.
            if (!protectionsEnabled) {
                await backgroundPage.evaluate(async (domain) => {
                    /* global dbg */
                    dbg.tabManager.setList({ list: 'allowlisted', domain, value: true });
                }, testHost);
            }

            // Load and run the request blocking test page.
            const { testCount, pageRequests } = await runRequestBlockingTest(page, testSite);
            expect(testCount).toBeGreaterThan(0);

            // Verify that the .jpg image requests were blocked as expected.
            for (const { url, status } of pageRequests) {
                // TODO: Figure out why the video.mp4 request is reported as
                //       blocked regardless.
                if (new URL(url).pathname.endsWith('video.mp4')) {
                    continue;
                }

                expect(status, `URL: ${url}, Allowlisted: ${!protectionsEnabled}`).toEqual(
                    expectBlocked(protectionsEnabled, url) ? 'blocked' : 'allowed',
                );
            }

            // Verify that the requests blocked by Request Blocklist were not
            // logged as blocked _tracking_ requests.
            const tabManagerTrackerCount = await backgroundPage.evaluate(async () => {
                const currentTab = await globalThis.dbg.utils.getCurrentTab();
                const trackers = globalThis.dbg.tabManager.get({ tabId: currentTab.id })?.trackers;

                let total = 0;
                for (const { urls: entry } of Object.values(trackers)) {
                    for (const { action } of Object.values(entry)) {
                        if (action === 'block') {
                            ++total;
                        }
                    }
                }
                return total;
            });
            expect(tabManagerTrackerCount).toEqual(0);

            await page.reload();
        }

        await page.close();
    });
});
