import { test, expect } from './helpers/playwrightHarness';
import { forAllConfiguration, forExtensionLoaded, forFunction } from './helpers/backgroundWait';

const blockedDomain = 'privacy-test-pages.site';
const blockedUrl = `https://${blockedDomain}/`;
const blockedSitesRuleId = 20011;
const blockedSitesSubresourceRuleId = 20012;

test.describe('User blocked websites', () => {
    test('options form installs and removes a complete domain block', async ({ backgroundPage, context, manifestVersion }) => {
        test.skip(manifestVersion !== 3, 'User blocked websites currently uses Chrome MV3 DNR');

        await forExtensionLoaded(context);
        await forAllConfiguration(backgroundPage);

        const extensionId = new URL(backgroundPage.url()).hostname;
        const optionsPage = await context.newPage();
        await optionsPage.goto(`chrome-extension://${extensionId}/html/options.html`);

        const blockSitesTab = optionsPage.locator('[data-options-tab="block-sites"]');
        const allowedSitesTab = optionsPage.locator('[data-options-tab="allowed-sites"]');
        const blockTrackersTab = optionsPage.locator('[data-options-tab="block-trackers"]');

        await expect(blockSitesTab).toHaveAttribute('aria-selected', 'true');
        await expect(optionsPage.locator('[data-options-panel="block-sites"]')).toBeVisible();

        await blockTrackersTab.click();
        await expect(optionsPage.locator('[data-options-panel="block-trackers"]')).toBeVisible();
        await expect(optionsPage.locator('.options-content__privacy')).toBeVisible();

        await allowedSitesTab.click();
        const allowedSitesPanel = optionsPage.locator('[data-options-panel="allowed-sites"]');
        await expect(allowedSitesTab).toHaveAttribute('aria-selected', 'true');
        await expect(allowedSitesPanel).not.toHaveAttribute('hidden', '');
        await expect(allowedSitesPanel).toBeEmpty();

        await blockSitesTab.click();
        const input = optionsPage.locator('.js-blocked-sites-input');
        await input.fill(blockedDomain);
        await optionsPage.locator('.js-blocked-sites-save').click();
        await expect(optionsPage.locator('.js-blocked-sites-status')).toHaveText('Blocked websites saved.');

        await forFunction(
            backgroundPage,
            async (ruleIds) => {
                const rules = await chrome.declarativeNetRequest.getDynamicRules();
                return ruleIds.every((ruleId) => rules.some((rule) => rule.id === ruleId));
            },
            [blockedSitesRuleId, blockedSitesSubresourceRuleId],
        );

        const installedRules = await backgroundPage.evaluate(
            async (ruleIds) => {
                const rules = await chrome.declarativeNetRequest.getDynamicRules();
                return rules.filter((rule) => ruleIds.includes(rule.id));
            },
            [blockedSitesRuleId, blockedSitesSubresourceRuleId],
        );
        const redirectRule = installedRules.find((rule) => rule.id === blockedSitesRuleId);
        const subresourceRule = installedRules.find((rule) => rule.id === blockedSitesSubresourceRuleId);
        expect(redirectRule.action).toEqual({
            type: 'redirect',
            redirect: {
                extensionPath: '/html/blocked.html',
            },
        });
        expect(redirectRule.condition.requestDomains).toEqual([blockedDomain]);
        expect(redirectRule.condition.resourceTypes).toEqual(['main_frame']);
        expect(subresourceRule.action.type).toBe('block');
        expect(subresourceRule.condition.requestDomains).toEqual([blockedDomain]);
        expect(subresourceRule.condition.resourceTypes).not.toContain('main_frame');

        const blockedPage = await context.newPage();
        await blockedPage.goto(blockedUrl);
        await expect(blockedPage).toHaveURL(`chrome-extension://${extensionId}/html/blocked.html`);
        await expect(blockedPage.locator('h1')).toHaveText('This site is blocked');

        await input.fill('');
        await optionsPage.locator('.js-blocked-sites-save').click();
        await expect(optionsPage.locator('.js-blocked-sites-status')).toHaveText('Blocked websites saved.');

        await forFunction(
            backgroundPage,
            async (ruleIds) => {
                const rules = await chrome.declarativeNetRequest.getDynamicRules();
                return ruleIds.every((ruleId) => !rules.some((rule) => rule.id === ruleId));
            },
            [blockedSitesRuleId, blockedSitesSubresourceRuleId],
        );

        await expect(blockedPage.goto(blockedUrl)).resolves.toBeTruthy();
    });
});
