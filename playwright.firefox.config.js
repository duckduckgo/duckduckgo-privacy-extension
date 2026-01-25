import { defineConfig, devices } from '@playwright/test';

/**
 * Firefox-specific Playwright configuration for integration tests.
 *
 * This is a work in progress, many of the tests don't run correctly yet.
 * See integration-test/FIREFOX.md for details on Firefox testing limitations.
 */

const supportedTests = [
    // Meta tests for test harness.
    'integration-test/background-eval.spec.js',
    'integration-test/request-events.spec.js',
    // Extension tests.
    'integration-test/fingerprint-randomization.spec.js',
    'integration-test/navigator-interface.spec.js',
    'integration-test/gpc.spec.js',
    'integration-test/request-blocking.spec.js',
    // Non-extension tests.
    'integration-test/facebook-sdk-schema.spec.js',
    'integration-test/youtube-sdk-schema.spec.js',
];

export default defineConfig({
    testDir: './integration-test',
    testMatch: supportedTests.map((f) => f.replace('integration-test/', '')),

    /* Maximum time one test can run */
    timeout: 30 * 1000,
    expect: {
        timeout: 5000,
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
