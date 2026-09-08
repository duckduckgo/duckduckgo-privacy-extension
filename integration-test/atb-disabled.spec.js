/**
 * The chromium-embedded build excludes ATB, so its install and search
 * workflows should leave no ATB traces.
 */
import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { isChromiumEmbedded } from './helpers/platform';

test.describe('ATB is disabled', () => {
    test.beforeEach(async ({ backgroundPage }) => {
        test.skip(!isChromiumEmbedded(), 'Only applies to the chromium-embedded build, which excludes ATB');
        // Wait for the extension to be fully started; if the install workflow
        // was included in this build, it would have run by now.
        await backgroundWait.forAllConfiguration(backgroundPage);
    });

    test('does not open the post-install page', async ({ context, backgroundPage }) => {
        const postInstallPage = context.pages().find((p) => p.url().startsWith('https://duckduckgo.com/extension-success'));
        expect(postInstallPage).toBeUndefined();

        // ...and none of the ATB install workflow ran in the background.
        const atbSettings = await backgroundPage.evaluate(() => ({
            atb: globalThis.dbg.settings.getSetting('atb'),
            extiSent: globalThis.dbg.settings.getSetting('extiSent'),
            hasSeenPostInstall: globalThis.dbg.settings.getSetting('hasSeenPostInstall'),
        }));
        expect(atbSettings.atb).toBeFalsy();
        expect(atbSettings.extiSent).toBeFalsy();
        expect(atbSettings.hasSeenPostInstall).toBeFalsy();
    });

    test('does not append the atb parameter to search queries', async ({ page, backgroundPage }) => {
        // An atb setting can be carried over in a profile that previously ran a
        // build with ATB included; searches still must not append the parameter.
        await backgroundPage.evaluate(() => globalThis.dbg.settings.updateSetting('atb', 'v123-1'));

        // On Chrome builds this recreates the ATB DNR rules from the stored
        // setting. This build must not.
        await backgroundPage.evaluate(() => globalThis.components.dnrListeners.postInstall());

        // Rules are added without being awaited, so flush the sequential rule
        // queue with an empty update before checking.
        const atbDnrRules = await backgroundPage.evaluate(async () => {
            await chrome.declarativeNetRequest.updateDynamicRules({});
            // Rule IDs used by ATB.setOrUpdateATBdnrRule.
            const atbRuleIds = [20003, 20008, 20009, 20010, 20011];
            const rules = await chrome.declarativeNetRequest.getDynamicRules();
            return rules.filter(
                (rule) =>
                    atbRuleIds.includes(rule.id) ||
                    (rule.action?.redirect?.transform?.queryTransform?.addOrReplaceParams || []).some((param) => param.key === 'atb'),
            );
        });
        expect(atbDnrRules).toEqual([]);

        await page.goto('https://duckduckgo.com/?q=test', { waitUntil: 'domcontentloaded' });

        const searchUrl = new URL(page.url());
        expect(searchUrl.hostname).toEqual('duckduckgo.com');
        expect(searchUrl.pathname).toEqual('/');
        expect(searchUrl.searchParams.get('q')).toEqual('test');
        expect(searchUrl.searchParams.get('atb')).toBeNull();
    });
});
