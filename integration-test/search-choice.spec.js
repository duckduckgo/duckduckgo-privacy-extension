import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';

const searchPage = '<html><body>search</body></html>';

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
 * Update the alternativeSearch setting and wait for the DNR rule to be applied.
 * The setting update is async (dispatches event after storage sync), so the
 * DNR rule isn't installed immediately.
 */
async function setAlternativeSearch(backgroundPage, value) {
    await backgroundPage.evaluate(async (val) => {
        globalThis.dbg.settings.updateSetting('alternativeSearch', val);
        // Wait for the storage sync + event dispatch to complete.
        await new Promise((resolve) => setTimeout(resolve, 500));
    }, value);
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
    test('redirects search to noai.duckduckgo.com when alternativeSearch is enabled', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await mockSearchPages(context);

        await setAlternativeSearch(backgroundPage, 'noai');
        await gotoAndExpectRedirect(page, 'https://duckduckgo.com/?q=test', /noai\.duckduckgo\.com\/\?q=test/);
    });

    test('does not redirect when alternativeSearch is disabled', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await mockSearchPages(context);

        await setAlternativeSearch(backgroundPage, '');
        await page.goto('https://duckduckgo.com/?q=test', { waitUntil: 'networkidle' });
        expect(page.url()).toContain('duckduckgo.com/?q=test');
        expect(page.url()).not.toContain('noai.duckduckgo.com');
    });

    test('redirects start.duckduckgo.com when alternativeSearch is enabled', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await mockSearchPages(context);

        await setAlternativeSearch(backgroundPage, 'noai');
        await gotoAndExpectRedirect(page, 'https://start.duckduckgo.com/', /noai\.duckduckgo\.com/);
    });

    test('does not redirect non-search pages on duckduckgo.com', async ({ context, backgroundPage, page }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await mockSearchPages(context);

        await setAlternativeSearch(backgroundPage, 'noai');
        await page.goto('https://duckduckgo.com/about', { waitUntil: 'networkidle' });
        expect(page.url()).toContain('duckduckgo.com/about');
        expect(page.url()).not.toContain('noai.duckduckgo.com');
    });
});
