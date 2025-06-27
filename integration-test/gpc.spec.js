import fs from 'fs';
import path from 'path';

import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';

function getGPCValueOfContext(ctx) {
    return ctx.evaluate(() => {
        return (async () => {
            return navigator.globalPrivacyControl;
        })();
    });
}

const fakeOrigin = 'http://test.example';

test('Ensure GPC is injected into frames', async ({ context, page, manifestVersion }) => {
    const frameTests = [`${fakeOrigin}:8081`, `${fakeOrigin}:8080`];
    await backgroundWait.forExtensionLoaded(context);
    await page.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        const data = await fs.promises.readFile(path.join(__dirname, 'data', 'pages', url.pathname));
        return route.fulfill({
            status: 200,
            body: data,
        });
    });

    for (const iframeHost of frameTests) {
        // Load an page with an iframe from a different hostname
        await page.bringToFront();
        await page.goto(`${fakeOrigin}/index.html?host=${iframeHost}`, { waitUntil: 'networkidle' });
        const gpc = await getGPCValueOfContext(page);

        const iframeInstance = page.frames().find((iframe) => iframe.url() === iframeHost + '/framed.html');
        const gpc2 = await getGPCValueOfContext(iframeInstance);

        expect(gpc).toEqual(true);
        expect(gpc).toEqual(gpc2);
    }

    // FIXME - chrome.scripting API is not yet injecting into about:blank
    //         frames correctly. See https://crbug.com/1360392.
    /* if (manifestVersion === 2) {
        // Load an page with an iframe from a different hostname
        await page.goto(`${fakeOrigin}/blank_framer.html`, { waitUntil: 'networkidle' });
        const gpc = await getGPCValueOfContext(page);

        const iframeInstance = page.frames().find((iframe) => iframe.url() === 'about:blank');
        const gpc2 = await getGPCValueOfContext(iframeInstance);

        expect(gpc).toEqual(true);
        expect(gpc).toEqual(gpc2);
    } */
});
