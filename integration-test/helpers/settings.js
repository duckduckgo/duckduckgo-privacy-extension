
/**
 * Update the useNoAiSearch setting and wait for the DNR rule to be applied.
 * The setting update is async (dispatches event after storage sync), so the
 * DNR rule isn't installed immediately.
 */
export async function setUseNoAiSearch(backgroundPage, value) {
    await backgroundPage.evaluate(async (val) => {
        const SEARCH_REDIRECT_RULE_ID = 20009;
        globalThis.dbg.settings.updateSetting('useNoAiSearch', val);
        // Wait for the storage sync + event dispatch + DNR rule install to complete.
        if (chrome.declarativeNetRequest?.getDynamicRules) {
            const want = val;
            while (true) {
                const rules = await chrome.declarativeNetRequest.getDynamicRules();
                if (rules.some((r) => r.id === SEARCH_REDIRECT_RULE_ID) === want) return;
                await new Promise((resolve) => setTimeout(resolve, 25));
            }
        }
    }, value);
}
