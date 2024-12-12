import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { routeFromLocalhost } from './helpers/testPages';
import { overridePrivacyConfig } from './helpers/testConfig';

const testSite = 'https://privacy-test-pages.site/privacy-protections/amp/';

test.describe('Test AMP link protection', () => {
    test.skip('Redirects AMP URLs correctly', async ({ context, backgroundPage, page, backgroundNetworkContext }) => {
        await overridePrivacyConfig(backgroundNetworkContext, 'amp-protection.json');
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await routeFromLocalhost(page);

        await page.goto(testSite, { waitUntil: 'networkidle' });
        await page.bringToFront();

        // Scrape the list of test cases.
        const testCases = [];

        const testGroups = await page.$$('#demo ul');
        const testGroupTitles = await page.$$('#demo > p');
        for (let i = 0; i < testGroups.length; i++) {
            const groupTitle = await page.evaluate((el) => el.innerText, testGroupTitles[i]);

            // "Deep link extraction" is not yet supported.
            if (groupTitle === 'First Party Cloaked AMP links') {
                continue;
            }

            for (const li of await testGroups[i].$$('li')) {
                testCases.push(
                    await page.evaluate(
                        // eslint-disable-next-line no-shadow
                        ({ li, groupTitle }) => {
                            const { innerText: testTitle, href: initialUrl } = li.querySelector('a');
                            const description = groupTitle + ': ' + testTitle;

                            let { innerText: expectedUrl } = li.querySelector('.expected');
                            // Strip the 'Expected: ' prefix and normalise the URL.
                            expectedUrl = expectedUrl.split(' ')[1];

                            return { initialUrl, expectedUrl, description };
                        },
                        { li, groupTitle },
                    ),
                );
            }
        }

        // Perform the tests.
        for (const { initialUrl, expectedUrl, description } of testCases) {
            // Test the URL was redirected.
            // Note: It would be preferable to use pageWait.forGoto() here
            //       instead, but some of the test cases are very slow to load.
            //       Since only the redirected main_frame URL is required for
            //       these tests, just wait for load rather than network idle.
            await page.goto(initialUrl, { waitUntil: 'commit' });
            expect(page.url(), description).toEqual(expectedUrl);
        }
    });
});
