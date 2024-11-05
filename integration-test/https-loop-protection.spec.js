import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { routeFromLocalhost } from './helpers/testPages';

const loopProtectionPage = 'https://good.third-party.site/privacy-protections/https-loop-protection/';

test.describe('Loop protection', () => {
    test('Loop protection page should prevent loading https:// infinately', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await routeFromLocalhost(page);

        await page.goto(loopProtectionPage, { waitUntil: 'networkidle' });
        await page.click('#start');
        await page.waitForFunction(() => results.date !== null && results.results[0].value !== null, { polling: 100, timeout: 20000 });
        const results = await page.evaluate(() => {
            return results;
        });

        // The expected outcome of this test is we land back on http:// rather than upgrading forever to https://
        const expectedValue = 'http://good.third-party.site/privacy-protections/https-loop-protection/http-only.html';
        expect(results.results[0].value).toEqual(expectedValue);
    });
});
