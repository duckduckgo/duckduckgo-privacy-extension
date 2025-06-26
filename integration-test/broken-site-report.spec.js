import { test, expect, mockAtb } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { routeFromLocalhost } from './helpers/testPages';
import { _formatPixelRequestForTesting } from '../shared/js/shared-utils/pixels';
import AbnExperimentMetrics from '../shared/js/background/components/abn-experiments';

test.describe('Broken site reports', () => {
    const pixels = [];
    let gotPixel;

    async function setUpPixelInterception({ context, backgroundPage, page, routeExtensionRequests }) {
        // set up extension and intercept pixels
        await backgroundWait.forExtensionLoaded(context);
        await routeFromLocalhost(page);
        let pixelResolver = null;
        gotPixel = new Promise((resolve) => {
            pixelResolver = resolve;
        });
        await routeExtensionRequests(
            'https://improving.duckduckgo.com/t/*',
            /**
            @param {import('@playwright/test').Route} route
        */ (route) => {
                const url = route.request().url();
                pixels.push(url);
                pixelResolver();
                return route.abort();
            },
        );
    }

    test('Sends broken site reports with current page context', async ({ context, backgroundPage, page, routeExtensionRequests }) => {
        await setUpPixelInterception({ context, backgroundPage, page, routeExtensionRequests });
        const extensionVersion = require('../browsers/chrome/manifest.json').version;

        await page.goto('https://privacy-test-pages.site/', { waitUntil: 'networkidle' });
        await page.bringToFront();
        await backgroundPage.evaluate(() => globalThis.components.dashboardMessaging.submitBrokenSiteReport({ category: 'dislike' }));
        await gotPixel;
        expect(pixels).toHaveLength(1);
        const pixel = _formatPixelRequestForTesting(pixels[0]);
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
        expect(pixel.params.jsPerformance).toMatch(/^[0-9]+$/);
        expect(pixel.params.locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    });

    test('Includes correct metadata when blocklist fetch fails', async ({ context, backgroundPage, page, routeExtensionRequests }) => {
        // block all CDN requests
        routeExtensionRequests('https://staticcdn.duckduckgo.com/**/*', (route) => {
            return route.abort();
        });
        const bundledConfigEtag = require('../shared/data/etags.json')['config-etag'];
        const bundledConfigVersion = String(require('../shared/data/bundled/extension-config.json').version);
        await setUpPixelInterception({ context, backgroundPage, page, routeExtensionRequests });
        await page.goto('https://privacy-test-pages.site/', { waitUntil: 'networkidle' });
        await page.bringToFront();
        await backgroundPage.evaluate(() => globalThis.components.dashboardMessaging.submitBrokenSiteReport({ category: 'dislike' }));
        await gotPixel;
        expect(pixels).toHaveLength(1);
        const pixel = _formatPixelRequestForTesting(pixels[0]);
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

test.describe('Cohort wiring for breakage reports', () => {
    test('includes cohorts if abnMetrics is set before tab creation', async ({ context, backgroundPage, page, routeExtensionRequests }) => {
        // Set up pixel interception
        const pixels = [];
        let pixelResolver = null;
        const gotPixel = new Promise((resolve) => {
            pixelResolver = resolve;
        });
        await backgroundWait.forExtensionLoaded(context);
        await routeFromLocalhost(page);
        await routeExtensionRequests('https://improving.duckduckgo.com/t/*', (route) => {
            const url = route.request().url();
            pixels.push(url);
            pixelResolver();
            return route.abort();
        });

        // Inject abnMetrics before tab creation
        await backgroundPage.evaluate(() => {
            const remoteConfig = {
                getSubFeatureNames: () => ['test-feature'],
                getCohortName: () => 'treatment',
                getCohort: () => ({ name: 'treatment' }),
                setCohort: () => {},
                onUpdate: () => {},
            };
            globalThis.components.abnMetrics = new AbnExperimentMetrics({ remoteConfig });
        });

        await page.goto('https://privacy-test-pages.site/', { waitUntil: 'networkidle' });
        await page.bringToFront();
        await backgroundPage.evaluate(() => globalThis.components.dashboardMessaging.submitBrokenSiteReport({ category: 'dislike' }));
        await gotPixel;
        const pixel = _formatPixelRequestForTesting(pixels[0]);
        expect(pixel.params.contentScopeExperiments).toContain('test-feature:treatment');
    });

    test('does not include cohorts if abnMetrics is not set at tab creation', async ({
        context,
        backgroundPage,
        page,
        routeExtensionRequests,
    }) => {
        // Set up pixel interception
        const pixels = [];
        let pixelResolver = null;
        const gotPixel = new Promise((resolve) => {
            pixelResolver = resolve;
        });
        await backgroundWait.forExtensionLoaded(context);
        await routeFromLocalhost(page);
        await routeExtensionRequests('https://improving.duckduckgo.com/t/*', (route) => {
            const url = route.request().url();
            pixels.push(url);
            pixelResolver();
            return route.abort();
        });

        // abnMetrics is not set before tab creation
        await page.goto('https://privacy-test-pages.site/', { waitUntil: 'networkidle' });
        await page.bringToFront();
        // Now set abnMetrics, but too late for the tab
        await backgroundPage.evaluate(() => {
            const remoteConfig = {
                getSubFeatureNames: () => ['test-feature'],
                getCohortName: () => 'treatment',
                getCohort: () => ({ name: 'treatment' }),
                setCohort: () => {},
                onUpdate: () => {},
            };
            globalThis.components.abnMetrics = new AbnExperimentMetrics({ remoteConfig });
        });
        await backgroundPage.evaluate(() => globalThis.components.dashboardMessaging.submitBrokenSiteReport({ category: 'dislike' }));
        await gotPixel;
        const pixel = _formatPixelRequestForTesting(pixels[0]);
        expect(pixel.params.contentScopeExperiments).toBeUndefined();
    });
});
