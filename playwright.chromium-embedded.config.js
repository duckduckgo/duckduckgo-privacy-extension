import { defineConfig, devices } from '@playwright/test';

// Note: We can't rely on npm_lifecycle_event because npx overwrites it.
process.env.DDG_PLATFORM = 'chromium-embedded';

/**
 * The chromium-embedded build only includes a subset of the extension's
 * features (see the BUILD_TARGET checks in shared/js/background/background.js),
 * so tests are opted-in via an explicit allowlist rather than an ignore list.
 * That way new specs written for the full extension don't silently start
 * running against this build.
 */
const includedTests = [
    'atb-disabled.spec.js',
    'cookie-prompt-management.spec.js',
    'playwright-harness.spec.js',
    'request-blocking.spec.js',
    'request-blocklist.spec.js',
    'url-parameters.spec.js',
    'privacy-dashboard.spec.js',
    'empty-config.spec.js',
    'broken-site-report.spec.js',
    'gpc.spec.js',
    'https-loop-protection.spec.js',
    'navigator-interface.spec.js',
];

export default defineConfig({
    testDir: './integration-test',
    testMatch: includedTests,
    /* Maximum time one test can run for. */
    timeout: 30 * 1000,
    expect: {
        timeout: 5000,
    },
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry flakey tests */
    retries: 2,
    /* Opt out of parallel tests on CI. */
    workers: undefined,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: process.env.CI ? 'github' : 'html',
    use: {
        actionTimeout: 0,
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
        extensionPath: 'build/chromium-embedded/dev',
    },

    projects: [
        {
            name: 'chromium-embedded',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'cd node_modules/privacy-test-pages && node server.js',
        port: 3000,
        reuseExistingServer: !process.env.CI,
    },
});
