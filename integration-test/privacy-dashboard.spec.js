import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { routeFromLocalhost } from './helpers/testPages';
import { overridePrivacyConfig } from './helpers/testConfig';

const testSite = 'https://privacy-test-pages.site/privacy-protections/request-blocking/';

test.describe('Test privacy dashboard', () => {
    test('Should load the dashboard with correct link text', async ({ context, backgroundPage, page, backgroundNetworkContext }) => {
        await overridePrivacyConfig(backgroundNetworkContext, 'serviceworker-blocking.json');
        await backgroundWait.forExtensionLoaded(context);
        await backgroundWait.forAllConfiguration(backgroundPage);
        await routeFromLocalhost(page);

        await page.goto(testSite, { waitUntil: 'networkidle' });
        await page.bringToFront();
        await page.click('#start');

        const panelUrl = await backgroundPage.evaluate(async () => {
            const currentTab = await globalThis.dbg.utils.getCurrentTab();
            const manifest = chrome.runtime.getManifest();
            const popupPath = manifest.action?.default_popup || manifest.browser_action?.default_popup;
            return chrome.runtime.getURL(`${popupPath}?tabId=${currentTab.id}`);
        });

        const panel = await context.newPage();
        await panel.goto(panelUrl);
        await panel.bringToFront();

        await expect(panel).toHaveTitle('OpenFocusd');
        const links = await linksText(panel);
        expect(links).toEqual(['Connection Is Encrypted', 'Requests Blocked from Loading', 'No Third-Party Requests Found']);

        const search = panel.locator('.site-info > .page-inner > .search');
        await expect(search).toBeVisible();
        expect(await search.evaluate((element) => element === element.parentElement?.lastElementChild)).toBe(true);

        const spreadPromotionDisplay = await panel.evaluate(() => {
            const screen = document.createElement('div');
            screen.className = 'cta-screen';
            const promotion = document.createElement('div');
            promotion.className = 'cta';
            screen.append(promotion);
            document.body.append(screen);
            const display = getComputedStyle(promotion).display;
            screen.remove();
            return display;
        });
        expect(spreadPromotionDisplay).toBe('none');
    });
});

async function linksText(panel) {
    // the list of CSS selectors for the main-nav links
    const links = [
        '[aria-label="View Connection Information"]',
        '[aria-label="View Tracker Companies"]',
        '[aria-label="View Non-Tracker Companies"]',
    ];

    // create 1 combined css selector for all elements
    const cssSelector = links.join(',');

    // we don't want to make any assertions until the elements are rendered
    await panel.waitForFunction((selector) => document.querySelectorAll(selector).length === 3, cssSelector);

    // now we can read the text-content of each element
    return panel.evaluate((selector) => {
        const elements = Array.from(document.querySelectorAll(selector));
        return elements.map((li) => {
            return li.textContent.trim();
        });
    }, cssSelector);
}
