import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { isFirefox } from './helpers/platform';
import { setUseNoAiSearch } from './helpers/settings';

const searchPage = '<html><body>search</body></html>';

const NEW_TAB_CHROME_ONLY_DESC = 'noai=1 on the new tab page is applied by an MV3 DNR rule (Chrome only)';

function mockSearchPages(context) {
    return context.route(
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
 * Navigate to a URL that may be redirected by the extension (via DNR on MV3
 * or webRequest on MV2). The redirect aborts the original navigation, so
 * catch ERR_ABORTED and poll for the expected final URL.
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
    test('redirects search to noai.duckduckgo.com when useNoAiSearch is enabled', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await mockSearchPages(context);

        await setUseNoAiSearch(backgroundPage, true);
        await gotoAndExpectRedirect(page, 'https://duckduckgo.com/?q=test', /noai\.duckduckgo\.com\/\?q=test/);
    });

    test('does not redirect when useNoAiSearch is disabled', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await mockSearchPages(context);

        await setUseNoAiSearch(backgroundPage, false);
        await page.goto('https://duckduckgo.com/?q=test', { waitUntil: 'networkidle' });
        expect(page.url()).toContain('duckduckgo.com/?q=test');
        expect(page.url()).not.toContain('noai.duckduckgo.com');
    });

    test('does not redirect non-search pages on duckduckgo.com', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await mockSearchPages(context);

        await setUseNoAiSearch(backgroundPage, true);
        await page.goto('https://duckduckgo.com/about', { waitUntil: 'networkidle' });
        expect(page.url()).toContain('duckduckgo.com/about');
        expect(page.url()).not.toContain('noai.duckduckgo.com');
    });

    test('adds noai=1 to the new tab page when useNoAiSearch is enabled', async ({ context, backgroundPage, page }) => {
        test.skip(isFirefox(), NEW_TAB_CHROME_ONLY_DESC);
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await mockSearchPages(context);

        await setUseNoAiSearch(backgroundPage, true);
        await gotoAndExpectRedirect(page, 'https://duckduckgo.com/chrome_newtab', /chrome_newtab\?(?=.*atb=)(?=.*noai=1)/);
    });

    test('removes noai=1 from the new tab page, keeping atb, when useNoAiSearch is turned off', async ({
        context,
        backgroundPage,
        page,
    }) => {
        test.skip(isFirefox(), NEW_TAB_CHROME_ONLY_DESC);
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await mockSearchPages(context);

        await setUseNoAiSearch(backgroundPage, true);
        await gotoAndExpectRedirect(page, 'https://duckduckgo.com/chrome_newtab', /chrome_newtab\?.*noai=1/);

        await setUseNoAiSearch(backgroundPage, false);
        await gotoAndExpectRedirect(page, 'https://duckduckgo.com/chrome_newtab', /chrome_newtab\?atb=/);
        expect(page.url()).not.toContain('noai=1');
    });
});
