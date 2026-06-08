import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Note: We can't rely on npm_lifecycle_event because npx overwrites it.
process.env.DDG_PLATFORM = 'firefox';

const excludedTests = ['cookie-prompt-management.spec.js', 'fire-button.spec.js', 'onboarding.spec.js', 'click-attribution.spec.js'];

export default defineConfig({
    testDir: './integration-test',
    testMatch: '*.spec.js',
    testIgnore: excludedTests,

    globalSetup: 'firefox-webext-playwright-harness/globalSetup',

    // Note: Tests need more time to run against Firefox due to the harness' RDP
    //       overhead.
    timeout: 60 * 1000,
    expect: {
        timeout: 5000,
    },

    fullyParallel: false,

    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 10,

    reporter: process.env.CI ? 'github' : 'html',

    use: {
        actionTimeout: 15000,
        trace: 'on-first-retry',
        firefoxHarnessConfig: {
            addonId: 'jid1-ZAdIEUB7XOzOJw@jetpack',
            extensionPath: path.join(process.cwd(), 'build/firefox/dev'),
            rewriteStaticRules: [['extension-firefox-config.json', 'extension-chrome-config.json']],
            postInstallPages: ['https://duckduckgo.com/extension-success'],
        },
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
