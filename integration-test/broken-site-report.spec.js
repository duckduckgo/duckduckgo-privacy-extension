import { test, expect, mockAtb } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { routeFromLocalhost } from './helpers/testPages';
import { listenForBreakageReport } from './helpers/pixels';

test.describe('Broken site reports', () => {
    test('Sends broken site reports with current page context', async ({ context, backgroundPage, page, backgroundNetworkContext }) => {
        await backgroundWait.forExtensionLoaded(context);
        await routeFromLocalhost(page);
        const breakageReport = listenForBreakageReport(backgroundNetworkContext);
        const extensionVersion = require('../browsers/chrome/manifest.json').version;

        await page.goto('https://privacy-test-pages.site/', { waitUntil: 'networkidle' });
        await page.bringToFront();
        await backgroundPage.evaluate(() => globalThis.components.dashboardMessaging.submitBrokenSiteReport({ category: 'dislike' }));
        const pixel = await breakageReport;
        expect(pixel).toMatchObject({
            name: 'epbf_chrome',
            params: {
                adAttributionRequests: '',
                atb: mockAtb.version,
                blockedTrackers: '',
                category: 'dislike',
                ctlFacebookLogin: 'false',
                ctlFacebookPlaceholderShown: 'false',
                ctlYouTube: 'false',
                errorDescriptions: '[]',
                extensionVersion,
                ignoreRequests: '',
                ignoredByUserRequests: '',
                // jsPerformance: '',
                // locale: 'en-GB',
                noActionRequests: '',
                openerContext: 'external',
                performanceWarning: 'false',
                protectionsState: 'true',
                remoteConfigEtag: 'test',
                remoteConfigVersion: '1697802863205',
                siteUrl: 'https://privacy-test-pages.site/',
                surrogates: '',
                tds: 'test',
                upgradedHttps: 'false',
                urlParametersRemoved: 'false',
                userRefreshCount: '0',
            },
        });
        // jsPerformance may be undefined if content-scope-scripts breakageReporting feature isn't enabled
        if (pixel.params.jsPerformance) {
            expect(pixel.params.jsPerformance).toMatch(/^[0-9]+$/);
        }
        expect(pixel.params.locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    });

    test('Includes correct metadata when blocklist fetch fails', async ({
        context,
        backgroundPage,
        page,
        backgroundNetworkContext,
        routeExtensionRequests,
    }) => {
        // block all CDN requests
        routeExtensionRequests('https://staticcdn.duckduckgo.com/**/*', (route) => {
            return route.abort();
        });
        const bundledConfigEtag = require('../shared/data/etags.json')['config-etag'];
        const bundledConfigVersion = String(require('../shared/data/bundled/extension-config.json').version);
        await backgroundWait.forExtensionLoaded(context);
        await routeFromLocalhost(page);
        const breakageReport = listenForBreakageReport(backgroundNetworkContext);
        await page.goto('https://privacy-test-pages.site/', { waitUntil: 'networkidle' });
        await page.bringToFront();
        await backgroundPage.evaluate(() => globalThis.components.dashboardMessaging.submitBrokenSiteReport({ category: 'dislike' }));
        const pixel = await breakageReport;
        expect(pixel).toMatchObject({
            name: 'epbf_chrome',
            params: {
                adAttributionRequests: '',
                atb: mockAtb.version,
                blockedTrackers: '',
                category: 'dislike',
                ctlFacebookLogin: 'false',
                ctlFacebookPlaceholderShown: 'false',
                ctlYouTube: 'false',
                errorDescriptions: '[]',
                ignoreRequests: '',
                ignoredByUserRequests: '',
                // jsPerformance: '',
                // locale: 'en-GB',
                noActionRequests: '',
                openerContext: 'external',
                performanceWarning: 'false',
                protectionsState: 'true',
                remoteConfigEtag: bundledConfigEtag,
                remoteConfigVersion: bundledConfigVersion,
                siteUrl: 'https://privacy-test-pages.site/',
                surrogates: '',
                tds: '',
                upgradedHttps: 'false',
                urlParametersRemoved: 'false',
                userRefreshCount: '0',
            },
        });
    });
});
