import { test, expect } from '@playwright/test';
import apiSchema from './helpers/apiSchema';
import { routeFromLocalhost } from './helpers/testPages';

const testSite = 'https://privacy-test-pages.site/privacy-protections/click-to-load/';

// We're using the original playwright test function which does not load the extension
test.describe('Facebook SDK schema', () => {
    test("CTL: Facebook SDK schema hasn't changed", async ({ page }) => {
        await routeFromLocalhost(page);
        await page.goto(testSite);

        await page.waitForFunction(() => typeof window.FB !== 'undefined');

        // Note: If these tests fail, update the
        //       /integration-test/data/api_schemas/facebook-sdk.json file
        //       to match
        //       /integration-test/artifacts/api_schemas/facebook-sdk.json
        //       and make any corresponding changes required to the surrogate
        //       script /shared/data/web_accessible_resources/facebook-sdk.js.
        //       If no changes to the surrogate scripts are required, please
        //       explain why to the reviewer!
        //
        //  See also https://developers.facebook.com/docs/graph-api/changelog

        const { actualSchema, expectedSchema } = await apiSchema.setupAPISchemaTest(page, 'facebook-sdk.json', ['FB']);
        expect(actualSchema).toEqual(expectedSchema);
    });
});
