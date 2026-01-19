import { test, expect, isFirefoxTest } from './helpers/playwrightHarness.js';

test.describe('Firefox background page evaluation', () => {
    test('can evaluate code in extension background', async ({ backgroundPage }) => {
        // This test specifically tests Firefox background page evaluation
        if (!isFirefoxTest()) {
            test.skip();
            return;
        }

        // Check that backgroundPage is available
        expect(backgroundPage).not.toBeNull();
        expect(backgroundPage.isAvailable()).toBe(true);

        // Test simple evaluation
        const manifestName = await backgroundPage.evaluate(() => {
            return browser.runtime.getManifest().name;
        });
        expect(manifestName).toBe('DuckDuckGo Privacy Essentials');

        // Test evaluation with arguments
        const result = await backgroundPage.evaluate(
            (a, b) => {
                return a + b;
            },
            2,
            3,
        );
        expect(result).toBe(5);

        // Test string argument
        const greeting = await backgroundPage.evaluate((name) => {
            return 'Hello, ' + name;
        }, 'Firefox');
        expect(greeting).toBe('Hello, Firefox');

        // Test returning an object (important for compatibility with existing tests)
        const obj = await backgroundPage.evaluate(() => {
            return { foo: 'bar', num: 42, bool: true };
        });
        expect(obj.foo).toBe('bar');
        expect(obj.num).toBe(42);
        expect(obj.bool).toBe(true);

        // Test returning an array
        const arr = await backgroundPage.evaluate(() => {
            return [1, 2, 3, 'four'];
        });
        expect(arr).toEqual([1, 2, 3, 'four']);
    });

    test('background page evaluation works for Chrome too', async ({ backgroundPage }) => {
        // This test runs on Chrome as well to verify the API works
        if (isFirefoxTest()) {
            test.skip();
            return;
        }

        // Chrome's backgroundPage should also support evaluate
        expect(backgroundPage).not.toBeNull();

        const manifestName = await backgroundPage.evaluate(() => {
            return chrome.runtime.getManifest().name;
        });
        // Chrome and Firefox have different extension names, just verify it's a DuckDuckGo extension
        expect(manifestName).toContain('DuckDuckGo');
    });
});
