import { getDomain } from 'tldts';
import { EventEmitter } from 'node:events';

import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { waitForNetworkIdle } from './helpers/pageWait';
import { overridePrivacyConfig, overrideTds } from './helpers/testConfig';
import { routeFromLocalhost } from './helpers/testPages';
import { logPageRequests } from './helpers/requests';

const testSite = 'https://privacy-test-pages.site/privacy-protections/click-to-load/';
const facebookDomains = new Set(['facebook.com', 'facebook.net', 'fbcdn.net']);

function countFacebookRequests(requests) {
    let allowCount = 0;
    // Note: Does not include the SDK request. Playwright is now reporting that
    //       as having the URL of chrome://invalid, with no redirection/status
    //       information.
    let blockCount = 0;

    for (const request of requests) {
        const domain = getDomain(request.url.href);

        if (domain && facebookDomains.has(domain)) {
            if (request.status === 'blocked') {
                blockCount += 1;
            } else {
                // Consider anything not blocked as allowed, so that block tests
                // don't miss redirected requests or failed requests.
                allowCount += 1;
            }
        }
    }

    return { allowCount, blockCount };
}

/**
 * When blocking the Facebook iframes, Playwright sometimes sends the blocked
 * events too late, which can cause the following tests to fail. This workaround
 * isn't ideal, in particular since the iframe count is hardcoded (since the
 * iframes and other elements are replaced with CTL placeholders and so aren't
 * easily queryable), but it's enough to get the tests passing more reliably.
 */
const facebookIframeCount = 7;
async function waitForFacebookIframeRequests(page, requests) {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
        const { allowCount, blockCount } = countFacebookRequests(requests);
        if (allowCount + blockCount >= facebookIframeCount) {
            break;
        }
        await page.waitForTimeout(50);
    }
}

test.describe('Test Facebook Click To Load', () => {
    test.beforeEach(async ({ context, backgroundPage, backgroundNetworkContext }) => {
        // Overwrite the parts of the configuration needed for our tests.
        await overridePrivacyConfig(backgroundNetworkContext, 'click-to-load-facebook.json');
        await overrideTds(backgroundNetworkContext, 'click-to-load-tds.json');
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
    });

    test('CTL: Facebook request blocking/redirecting', async ({ page, backgroundPage }) => {
        const facebookRequests = new EventEmitter();
        await routeFromLocalhost(page, (route) => {
            const url = route.request().url();
            if (facebookDomains.has(getDomain(url))) {
                // blocking facebook requests at this layer reports these requests as 'failed' to
                // the page request logger, allowing us to differentiate between 'blocked' requests
                // and ones which would be allowed without this route.
                if (url.includes('sdk.js')) {
                    facebookRequests.emit('sdk', url);
                }
                route.abort();
                return true;
            }
            return false;
        });
        const pageRequests = [];
        const cleanup = await logPageRequests(backgroundPage, page, pageRequests);

        await page.goto(testSite, { waitUntil: 'networkidle' });
        await waitForFacebookIframeRequests(page, pageRequests);
        {
            const { allowCount, blockCount } = countFacebookRequests(pageRequests);
            expect(allowCount).toEqual(0);
            expect(blockCount).toBeGreaterThan(0);
        }

        pageRequests.length = 0;
        const buttonCount = await page.evaluate(() => {
            globalThis.buttons = Array.from(document.querySelectorAll('body > div'))
                .map((div) => div.shadowRoot && div.shadowRoot.querySelector('button'))
                .filter((button) => button && button.innerText.startsWith('Unblock'));
            return globalThis.buttons.length;
        });
        for (let i = 0; i < buttonCount; i++) {
            const button = await page.evaluateHandle((pageI) => globalThis.buttons[pageI], i);
            try {
                await button.click();
            } catch (e) {}
        }
        await waitForNetworkIdle(page, 1000);
        {
            const { allowCount, blockCount } = countFacebookRequests(pageRequests);
            expect(allowCount).toBeGreaterThan(0);
            expect(blockCount).toEqual(0);
        }
        // navigate away to allow all requests to complete before we clear request data
        await page.goto('https://privacy-test-pages.site/');
        // When the page is reloaded, requests should be blocked again.
        pageRequests.length = 0;
        await page.goto(testSite, { waitUntil: 'networkidle', timeout: 15000 });
        await waitForFacebookIframeRequests(page, pageRequests);
        {
            const { allowCount, blockCount } = countFacebookRequests(pageRequests);
            expect(allowCount).toEqual(0);
            expect(blockCount).toBeGreaterThan(0);
        }
        cleanup();
    });
});
