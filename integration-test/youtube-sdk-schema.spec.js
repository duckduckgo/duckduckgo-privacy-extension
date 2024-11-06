import { test, expect } from '@playwright/test';
import apiSchema from './helpers/apiSchema';
import { routeFromLocalhost } from './helpers/testPages';

const testSite = 'https://privacy-test-pages.site/privacy-protections/youtube-click-to-load/';

// We're using the original playwright test function which does not load the extension
test.describe('YouTube Iframe Player API schema', () => {
    test("CTL: YouTube SDK schema hasn't changed", async ({ page }) => {
        await routeFromLocalhost(page);
        await page.goto(testSite);

        await page.waitForFunction(() => typeof window.YT !== 'undefined');

        // Note: If these tests fail, update the
        //       /integration-test/data/api_schemas/youtube-iframe-api.json file
        //       to match
        //       /integration-test/artifacts/api_schemas/youtube-iframe-api.json
        //       and make any corresponding changes required to the surrogate
        //       script /shared/data/web_accessible_resources/youtube-iframe-api.js.
        //       If no changes to the surrogate scripts are required, please
        //       explain why to the reviewer!

        const { actualSchema, expectedSchema } = await apiSchema.setupAPISchemaTest(page, 'youtube-iframe-api.json', ['YT', 'YTConfig']);
        expect(actualSchema).toEqual(expectedSchema);
    });
});
