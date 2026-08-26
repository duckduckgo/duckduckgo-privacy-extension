/**
 * The opposite of atb.spec.js: the chromium-embedded build does not include
 * the ATB component (see setupAtb in background.js), so the install and
 * search workflows should leave no ATB traces.
 */
import { test, expect } from './helpers/playwrightHarness';
import backgroundWait from './helpers/backgroundWait';
import { isChromiumEmbedded } from './helpers/platform';

test.describe('ATB is disabled', () => {
    test.beforeEach(async ({ context, backgroundPage }) => {
        test.skip(!isChromiumEmbedded(), 'Only applies to the chromium-embedded build, which excludes ATB');
        // Wait for the extension to be fully started, so that the install
        // workflow would have run by now if it was included in the build.
        await backgroundWait.forExtensionLoaded(context);
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
        // Even with an atb setting present (e.g. carried over in a profile
        // that previously ran a build with ATB included), searches should not
        // be redirected to append the atb parameter.
        await backgroundPage.evaluate(() => globalThis.dbg.settings.updateSetting('atb', 'v123-1'));

        // Re-run the extension's install/update handling with that value in
        // place. On Chrome builds, DNRListeners.postInstall recreates the ATB
        // DNR rules from the stored setting - this build must not.
        await backgroundPage.evaluate(() => globalThis.components.dnrListeners.postInstall());

        // The ATB DNR rules are added without being awaited, so allow time for
        // them to (incorrectly) show up before checking.
        const atbDnrRules = await backgroundPage.evaluate(async () => {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            // Rule IDs used by ATB.setOrUpdateATBdnrRule, see dnr-utils.js.
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
