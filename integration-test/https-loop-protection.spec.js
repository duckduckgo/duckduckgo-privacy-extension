import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { routeFromLocalhost } from './helpers/testPages';

const loopProtectionPage = 'https://good.third-party.site/privacy-protections/https-loop-protection/';

test.describe('Loop protection', () => {
    test('Loop protection page should prevent loading https:// infinately', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await routeFromLocalhost(page);

        // HTTPS loop detection considers REQUEST_REDIRECT_LIMIT upgrades within
        // MAINFRAME_RESET_MS to be a loop.
        const [REQUEST_REDIRECT_LIMIT, MAINFRAME_RESET_MS] = await backgroundPage.evaluate(() => [
            globalThis.dbg.HttpsRedirects.REQUEST_REDIRECT_LIMIT,
            globalThis.dbg.HttpsRedirects.MAINFRAME_RESET_MS,
        ]);

        const upgradeTimes = [];
        context.on('request', (request) => {
            if (request.url().startsWith('https://') && request.url().includes('http-only.html')) {
                upgradeTimes.push(Date.now());
            }
        });

        await page.goto(loopProtectionPage, { waitUntil: 'networkidle' });
        await page.click('#start');
        await page.waitForFunction(() => results.date !== null && results.results[0].value !== null, { polling: 100, timeout: 20000 });

        // When the tests are running too slowly, the redirections don't happen
        // quickly enough to trigger the loop protection feature.
        // Note: Use the request after REQUEST_REDIRECT_LIMIT, since that's when
        //       the feature's canRedirect check happens.
        const followingRequest = REQUEST_REDIRECT_LIMIT + 1;
        test.skip(
            !(upgradeTimes.length > followingRequest && upgradeTimes[followingRequest] - upgradeTimes[0] < MAINFRAME_RESET_MS),
            'Tests are running too slowly for HTTPS loop protection to activate.',
        );

        const results = await page.evaluate(() => results);

        // The expected outcome is we land back on http:// rather than upgrading forever to https://
        const expectedValue = 'http://good.third-party.site/privacy-protections/https-loop-protection/http-only.html';
        expect(results.results[0].value).toEqual(expectedValue);
    });
});
