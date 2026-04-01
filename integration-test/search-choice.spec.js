import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';

const searchPage = '<html><body>search</body></html>';

function mockSearchPages(page) {
    return page.route(
        (url) => {
            const hostname = url.hostname;
            return (
                (hostname === 'duckduckgo.com' || hostname === 'noai.duckduckgo.com' || hostname === 'start.duckduckgo.com') &&
                !url.pathname.startsWith('/atb') &&
                !url.pathname.startsWith('/exti')
            );
        },
        (route) => route.fulfill({ status: 200, contentType: 'text/html', body: searchPage }),
    );
}

/**
 * Navigate to a URL that may be redirected by the extension via tabs.update.
 * The extension intercepts onBeforeNavigate and calls tabs.update which aborts
 * the original navigation, so we catch ERR_ABORTED and poll for the final URL.
 */
async function gotoAndExpectRedirect(page, url, expectedUrlPattern) {
    try {
        await page.goto(url, { waitUntil: 'commit' });
    } catch (e) {
        if (!e.message.includes('ERR_ABORTED')) {
            throw e;
        }
    }
    await expect.poll(() => page.url(), { timeout: 5000 }).toMatch(expectedUrlPattern);
}

test.describe('Search Choice Tests', () => {
    test('redirects search to noai.duckduckgo.com when alternativeSearch is enabled', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await mockSearchPages(page);

        await backgroundPage.evaluate(() => {
            globalThis.dbg.settings.updateSetting('alternativeSearch', 'noai');
        });

        await gotoAndExpectRedirect(page, 'https://duckduckgo.com/?q=test', /noai\.duckduckgo\.com\/\?q=test/);
    });

    test('does not redirect when alternativeSearch is disabled', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await mockSearchPages(page);

        await backgroundPage.evaluate(() => {
            globalThis.dbg.settings.updateSetting('alternativeSearch', '');
        });

        await page.goto('https://duckduckgo.com/?q=test', { waitUntil: 'networkidle' });
        expect(page.url()).toContain('duckduckgo.com/?q=test');
        expect(page.url()).not.toContain('noai.duckduckgo.com');
    });

    test('redirects start.duckduckgo.com when alternativeSearch is enabled', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await mockSearchPages(page);

        await backgroundPage.evaluate(() => {
            globalThis.dbg.settings.updateSetting('alternativeSearch', 'noai');
        });

        await gotoAndExpectRedirect(page, 'https://start.duckduckgo.com/', /noai\.duckduckgo\.com/);
    });

    test('does not redirect non-search pages on duckduckgo.com', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await mockSearchPages(page);

        await backgroundPage.evaluate(() => {
            globalThis.dbg.settings.updateSetting('alternativeSearch', 'noai');
        });

        await page.goto('https://duckduckgo.com/about', { waitUntil: 'networkidle' });
        expect(page.url()).toContain('duckduckgo.com/about');
        expect(page.url()).not.toContain('noai.duckduckgo.com');
    });
});
