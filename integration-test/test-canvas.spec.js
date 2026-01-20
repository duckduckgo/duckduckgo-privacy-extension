import { test, expect, isFirefoxTest } from './helpers/playwrightHarness';
import { forExtensionLoaded } from './helpers/backgroundWait';
import { routeFromLocalhost } from './helpers/testPages';
import { overridePrivacyConfig } from './helpers/testConfig';

test.describe('Canvas verification', () => {
    // Skip for Firefox - canvas fingerprinting protection requires content script injection
    // which has timing issues in Firefox with RDP extension installation
    test.skip(isFirefoxTest(), 'Canvas tests require Chrome-specific content script timing');
    test.beforeEach(async ({ context, backgroundPage, backgroundNetworkContext }) => {
        await overridePrivacyConfig(backgroundNetworkContext, 'fingerprint-protection.json');
        await forExtensionLoaded(context);
    });

    test('Canvas drawing should be different per hostname', async ({ page }) => {
        await routeFromLocalhost(page);
        const hostnames = ['bad.third-party.site', 'good.third-party.site', 'broken.third-party.site'];
        const hostnameResults = {};
        for (const hostname of hostnames) {
            await page.goto(`https://${hostname}/features/canvas-draw.html`, { waitUntil: 'load' });
            // Wait for injection; will be resolved with MV3 changes
            await page.waitForFunction(() => navigator.globalPrivacyControl);
            await page.evaluate(() => {
                document.getElementById('draw-same').click();
            });
            await page.waitForFunction(() => results && results.complete);
            const results = await page.evaluate(() => results);
            results.results.forEach((a) => {
                if (!(a.id in hostnameResults)) {
                    hostnameResults[a.id] = new Set();
                }
                hostnameResults[a.id].add(a.value);
            });
        }

        // Check that we have unique values for each hostname in the sets
        for (const key in hostnameResults) {
            expect(hostnameResults[key].size).toEqual(hostnames.length, `${key} must be different for all ${hostnames.length} hostnames`);
        }
    });

    test('Canvas should pass all verification tests', async ({ page }) => {
        await page.bringToFront();
        await page.goto('https://bad.third-party.site/privacy-protections/fingerprinting/canvas.html?run');
        await page.waitForFunction(() => results && results.complete);
        const results = await page.evaluate(() => results);
        // filter out perf test from the fails
        const fails = results.fails.filter((f) => !f[0].startsWith('Getting image data must be under 250ms'));
        expect(fails).toHaveLength(0);
    });
});
