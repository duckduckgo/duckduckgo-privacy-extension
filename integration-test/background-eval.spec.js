import { test, expect, isFirefox } from './helpers/playwrightHarness.js';
import backgroundWait from './helpers/backgroundWait';

test.describe('test harness background page/ServiceWorker evaluation', () => {
    test('can evaluate code in extension background', async ({ context, backgroundPage }) => {
        expect(backgroundPage).not.toBeNull();
        await backgroundWait.forExtensionLoaded(context);

        if (isFirefox()) {
            expect(backgroundPage.isAvailable()).toBe(true);
        } else {
            expect(backgroundPage.isAvailable).toBe(undefined);
        }

        // Test simple evaluation
        const manifestName = await backgroundPage.evaluate(() => {
            return chrome.runtime.getManifest().name;
        });
        expect(manifestName.startsWith('DuckDuckGo')).toBe(true);

        // Test evaluation with arguments
        const result = await backgroundPage.evaluate(
            ({ a, b }) => {
                return a + b;
            },
            { a: 2, b: 3 },
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
});
