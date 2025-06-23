import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { routeFromLocalhost } from './helpers/testPages';
import { overridePrivacyConfigFromContent } from './helpers/testConfig';

const testSite = 'https://privacy-test-pages.site/content-scope-scripts/infra/pages/conditional-matching-experiments.html?automation=1';

// This config file should be created in integration-test/data/configs/
const configFile = 'https://privacy-test-pages.site/content-scope-scripts/infra/config/conditional-matching-experiments.json';

test.describe('Conditional Matching Experiments', () => {
    test('applies correct API manipulation for experiment cohort', async ({ context, backgroundPage, page, backgroundNetworkContext }) => {
        const configContent = await fetch(configFile).then((res) => res.json());
        expect(configContent).toBeDefined();
        await overridePrivacyConfigFromContent(backgroundNetworkContext, configContent);
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await routeFromLocalhost(page);

        await page.goto(testSite, { waitUntil: 'networkidle' });
        await page.bringToFront();

        // Click the button to run the tests
        await page.click('button');

        const results = await page.evaluate(() => window.results);
        // The expected value depends on the cohort assigned by the config; adjust as needed
        const allResults = Object.values(results).flat();
        for (const { result, expected } of allResults) {
            expect(result).toBe(expected);
        }
    });
});
