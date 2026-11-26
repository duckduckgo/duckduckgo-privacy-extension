import { test, expect, getHARPath } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { overridePrivacyConfig } from './helpers/testConfig';

const expectedFingerprintValues = {
    availTop: 0,
    availLeft: 0,
    wAvailTop: 0,
    wAvailLeft: 0,
    colorDepth: 24,
    pixelDepth: 24,
    vendorSub: '',
};

const tests = [
    { url: 'duckduckgo.com/about', har: getHARPath('duckduckgo.com/about.har') },
    { url: 'example.com', har: getHARPath('example.com/example.har') },
];

function testFPValues(values) {
    for (const [name, prop] of Object.entries(values)) {
        expect(prop, `${name}`).toEqual(expectedFingerprintValues[name]);
    }
}

test.describe('Fingerprint Defense Tests', () => {
    test.beforeEach(async ({ context }) => {
        await backgroundWait.forExtensionLoaded(context);
    });

    tests.forEach((testCase) => {
        test(`${testCase.url} should include anti-fingerprinting code`, async ({ context, page }) => {
            await page.routeFromHAR(testCase.har);
            await page.goto(`https://${testCase.url}`, { waitUntil: 'networkidle' });
            const values = await page.evaluate(() => {
                return {
                    availTop: screen.availTop,
                    availLeft: screen.availLeft,
                    wAvailTop: globalThis.screen.availTop,
                    wAvailLeft: globalThis.screen.availLeft,
                    colorDepth: screen.colorDepth,
                    pixelDepth: screen.pixelDepth,
                    vendorSub: navigator.vendorSub,
                };
            });
            testFPValues(values);
        });
    });
});

test.describe('First Party Fingerprint Randomization', () => {
    test.beforeEach(async ({ context, backgroundNetworkContext }) => {
        // Override config to remove unprotected sites. This is because fingerprint.js is loaded
        // from localhost by the test runner, so would normally be excluded from protections.
        await overridePrivacyConfig(backgroundNetworkContext, 'fingerprint-protection.json');
        await backgroundWait.forExtensionLoaded(context);
    });

    async function runTest(testCase, page) {
        await page.routeFromHAR(testCase.har);
        await page.goto(`https://${testCase.url}`);
        await page.addScriptTag({ path: 'node_modules/@fingerprintjs/fingerprintjs/dist/fp.js' });

        const fingerprint = await page.evaluate(() => {
            /* global FingerprintJS */
            return (async () => {
                const fp = await FingerprintJS.load();
                return fp.get();
            })();
        });
        return {
            canvas: fingerprint.components.canvas.value,
            plugin: fingerprint.components.plugins.value,
        };
    }

    for (const testCase of tests) {
        test(`Fingerprints should not change amongst page loads: ${testCase.url}`, async ({ page }) => {
            const result = await runTest(testCase, page);

            const result2 = await runTest(testCase, page);
            expect(result.canvas).toEqual(result2.canvas);
            expect(result.plugin).toEqual(result2.plugin);
        });
    }

    test('Fingerprints should not match across first parties', async ({ page }) => {
        const canvas = new Set();
        const plugin = new Set();

        for (const testCase of tests) {
            const result = await runTest(testCase, page);

            // Add the fingerprints to a set, if the result doesn't match it won't be added
            canvas.add(JSON.stringify(result.canvas));
            plugin.add(JSON.stringify(result.plugin));
        }

        // Ensure that the number of test pages match the number in the set
        expect(canvas.size).toEqual(tests.length);
        expect(plugin.size).toEqual(1);
    });
});

test.describe('Verify injected script is not visible to the page', () => {
    test.beforeEach(async ({ context }) => {
        await backgroundWait.forExtensionLoaded(context);
    });

    tests.forEach((testCase) => {
        test(`sjcl is not exposed to page scope: ${testCase.url}`, async ({ page }) => {
            await page.routeFromHAR(testCase.har);
            await page.goto(`https://${testCase.url}`);

            const sjclVal = await page.evaluate(() => {
                if ('sjcl' in globalThis) {
                    return 'visible';
                } else {
                    return 'invisible';
                }
            });
            expect(sjclVal).toEqual('invisible');
        });
    });
});

// Frames that have no URL of their own to match against (about:blank, srcdoc,
// blob: and data:) must get the same protections as the page that created them.
test.describe('Fingerprint Defense in frames without their own origin', () => {
    const frameMarkup = '<!doctype html><title>frame</title>';
    const frameTypes = [
        { name: 'about:blank', attributes: {} },
        { name: 'srcdoc', attributes: { srcdoc: frameMarkup } },
        { name: 'blob:', blob: true, attributes: {} },
        { name: 'data:', attributes: { src: `data:text/html,${encodeURIComponent(frameMarkup)}` } },
    ];
    const expectedFrameValues = {
        hasNavigatorInterface: true,
        hardwareConcurrency: 2,
        keyboard: 'undefined',
        colorDepth: 24,
        pixelDepth: 24,
    };

    function readValues() {
        return {
            hasNavigatorInterface: 'duckduckgo' in navigator,
            hardwareConcurrency: navigator.hardwareConcurrency,
            // @ts-expect-error - keyboard is not in the TypeScript DOM types
            keyboard: typeof navigator.keyboard,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth,
        };
    }

    test.beforeEach(async ({ context, backgroundPage, manifestVersion }) => {
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        if (manifestVersion === 3) {
            // wait for content-script registration to complete
            await backgroundPage.evaluate(() => globalThis.components.scriptInjection.ready);
        }
    });

    for (const frameType of frameTypes) {
        test(`${frameType.name} frames should include anti-fingerprinting code`, async ({ page }) => {
            const { url, har } = tests[1];
            await page.routeFromHAR(har);
            await page.goto(`https://${url}`, { waitUntil: 'networkidle' });

            // The top frame is the control: it is protected with or without the frame.
            await expect.poll(() => page.evaluate(readValues)).toEqual(expectedFrameValues);

            await page.evaluate(
                ({ attributes, blob, markup }) => {
                    const iframe = document.createElement('iframe');
                    iframe.id = 'frame-under-test';
                    for (const [name, value] of Object.entries(attributes)) {
                        iframe.setAttribute(name, value);
                    }
                    if (blob) {
                        iframe.src = URL.createObjectURL(new Blob([markup], { type: 'text/html' }));
                    }
                    document.body.appendChild(iframe);
                },
                { attributes: frameType.attributes, blob: Boolean(frameType.blob), markup: frameMarkup },
            );

            const frame = await (await page.locator('#frame-under-test').elementHandle())?.contentFrame();
            expect(frame, 'frame was created').toBeTruthy();
            await expect.poll(() => frame?.evaluate(readValues)).toEqual(expectedFrameValues);
        });
    }
});
