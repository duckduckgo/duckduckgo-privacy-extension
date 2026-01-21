import { defineConfig, devices } from '@playwright/test';

// Set environment variable to indicate Firefox tests
process.env.PWTEST_FIREFOX = '1';

/**
 * Firefox-specific Playwright configuration for integration tests.
 *
 * This runs a subset of integration tests that are compatible with Firefox.
 * See integration-test/FIREFOX.md for details on Firefox testing limitations.
 *
 * Tests that require Chrome-specific features (request interception for
 * extension background requests, content script timing, etc.) are excluded.
 */

// Test files that work on Firefox
// Limited set due to request interception not working for extension background requests
const firefoxTestFiles = [
    // Firefox-specific tests for background page evaluation
    'integration-test/firefox-background-eval.spec.js',
    // Extension functionality tests - content script injection
    'integration-test/fingerprint-randomization.spec.js',
    'integration-test/navigator-interface.spec.js',
    // Schema tests that don't require the extension
    'integration-test/facebook-sdk-schema.spec.js',
    'integration-test/youtube-sdk-schema.spec.js',
];

export default defineConfig({
    testDir: './integration-test',
    testMatch: firefoxTestFiles.map((f) => f.replace('integration-test/', '')),

    /* Maximum time one test can run */
    timeout: 60 * 1000,
    expect: {
        timeout: 10000,
    },

    /* Run tests sequentially for stability */
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,

    reporter: process.env.CI ? 'github' : 'html',

    use: {
        actionTimeout: 15000,
        trace: 'on-first-retry',
    },

    projects: [
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
    ],

    webServer: {
        command: 'cd node_modules/privacy-test-pages && node server.js',
        port: 3000,
        reuseExistingServer: !process.env.CI,
    },
});
