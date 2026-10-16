import fs from 'fs';
import path from 'path';

import { test, expect } from './helpers/playwrightHarness';
import { forExtensionLoaded } from './helpers/backgroundWait';

const fakeOrigin = 'http://test.example';

async function getFingerprintOfContext(ctx) {
    await ctx.addScriptTag({ path: 'node_modules/@fingerprintjs/fingerprintjs/dist/fp.js' });
    return ctx.evaluate(() => {
        /* global FingerprintJS */
        return (async () => {
            const fp = await FingerprintJS.load();
            const result = await fp.get();
            // FingerprintJS v5 skips canvas rendering on Firefox 120+ (assumes built-in protection),
            // so render the canvas directly to exercise the extension's protections.
            return { canvas: FingerprintJS.getUnstableCanvasFingerprint(false), components: result.components };
        })();
    });
}

const frameTests = [`${fakeOrigin}:8081`, `${fakeOrigin}:8080`];

test.describe('First Party Fingerprint Randomization', () => {
    frameTests.forEach((iframeHost) => {
        test(`Embedded same/cross-origin frames should match parent (frame: ${iframeHost})`, async ({ page, context, backgroundPage }) => {
            await forExtensionLoaded(context);
            await page.bringToFront();
            await page.route('**/*', async (route) => {
                const url = new URL(route.request().url());
                const data = await fs.promises.readFile(path.join(__dirname, 'data', 'pages', url.pathname));
                return route.fulfill({
                    status: 200,
                    body: data,
                });
            });
            // Load a page with an iframe from a different hostname
            await page.goto(`${fakeOrigin}:8080/index.html?host=${iframeHost}`, { waitUntil: 'networkidle' });
            const fingerprint = await getFingerprintOfContext(page);

            const iframeInstance = page.frames().find((iframe) => iframe.url() === iframeHost + '/framed.html');
            const fingerprint2 = await getFingerprintOfContext(iframeInstance);

            expect(fingerprint.canvas).toEqual(fingerprint2.canvas);
        });
    });
});
