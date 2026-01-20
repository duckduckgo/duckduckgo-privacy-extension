import { defineConfig, devices } from '@playwright/test';

/**
 * Firefox-specific Playwright configuration for integration tests.
 *
 * This configuration is used to run integration tests against Firefox.
 * It uses a custom test harness that installs the extension via Firefox's
 * Remote Debugging Protocol.
 *
 * Note: Some tests may need Firefox-specific adaptations due to differences
 * in how Playwright handles Firefox extensions vs Chrome extensions.
 */
export default defineConfig({
    testDir: './integration-test',
    /* Maximum time one test can run for - Firefox tests need more time
       due to RDP-based TDS/config overrides */
    timeout: 120 * 1000,
    expect: {
        /**
         * Maximum time expect() should wait for the condition to be met.
         */
        timeout: 10000,
    },
    /* Run tests in files in parallel - disabled for Firefox stability */
    fullyParallel: false,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 1 : 0,
    /* Single worker for Firefox extension tests */
    workers: 1,
    /* Reporter to use */
    reporter: process.env.CI ? 'github' : 'html',
    /* Shared settings */
    use: {
        /* Maximum time each action can take - Firefox actions may be slower */
        actionTimeout: 30000,
        /* Collect trace when retrying the failed test */
        trace: 'on-first-retry',
    },

    /* Configure Firefox project */
    projects: [
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'cd node_modules/privacy-test-pages && node server.js',
        port: 3000,
        reuseExistingServer: !process.env.CI,
    },
});
