import { test, expect, isFirefoxTest } from './helpers/playwrightHarness.js';

/**
 * Tests for Firefox background page evaluation via RDP.
 * These tests only run on Firefox to verify the custom RDP-based
 * background page evaluation implementation works correctly.
 */
test.describe('Firefox background page evaluation', () => {
    // Skip all tests in this file for Chrome - these are Firefox-specific tests
    test.skip(!isFirefoxTest(), 'Firefox-only tests');

    test('can evaluate code in extension background', async ({ backgroundPage }) => {
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
});
