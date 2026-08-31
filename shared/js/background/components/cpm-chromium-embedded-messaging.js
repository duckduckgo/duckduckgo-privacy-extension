import { CPMStandaloneMessaging } from './cpm-standalone-messaging';
import { SETTING_CHECK_TTL } from './cpm-embedded-messaging';
import { hasDdgApi, sendToBrowser } from './ddg-api-messaging';

/**
 * @typedef {import('./cookie-prompt-management').AutoconsentUserSettings} AutoconsentUserSettings
 */

/** Feature name shared with the macOS embedded build's native messages. */
const FEATURE_NAME = 'autoconsent';

/**
 * CPM messaging for the extension bundled into DDG-branded Chromium.
 *
 * Only what the browser knows and the extension does not goes over
 * `chrome.ddg`: the user's cookie-popup setting, which lives in browser prefs,
 * and the fact that a popup was handled, which the browser answers with UI in
 * its own chrome. Everything else stays extension-side exactly as in the
 * standalone build, because the extension owns it here — it fetches its own
 * remote config, owns the per-site protections the dashboard toggles, and
 * sends its own pixels.
 *
 * That is why this extends the standalone messaging rather than the embedded
 * messaging: the macOS build delegates all nine calls to native, and only two
 * of them are the browser's to answer in this build. The base class already
 * declares `@implements {CPMMessagingBase}`.
 */
export class CPMChromiumEmbeddedMessaging extends CPMStandaloneMessaging {
    /** @param {{ remoteConfig: import('./remote-config').default }} opts */
    constructor(opts) {
        super(opts);
        /** @type {{ time: number, value: AutoconsentUserSettings } | null} */
        this._settingsCache = null;
    }

    /**
     * The setting lives in browser prefs, so it has to be asked for. CPM checks
     * it on every frame's `init` and before every pixel, so the answer is cached
     * for the same window the macOS embedded build uses. Failures are cached
     * too — otherwise a browser that is not answering gets asked once per frame.
     *
     * @returns {Promise<AutoconsentUserSettings>}
     */
    async checkAutoconsentSetting() {
        if (this._settingsCache && Date.now() - this._settingsCache.time < SETTING_CHECK_TTL) {
            return this._settingsCache.value;
        }
        const value = await this._fetchAutoconsentSetting();
        this._settingsCache = { time: Date.now(), value };
        return value;
    }

    /**
     * @returns {Promise<AutoconsentUserSettings>}
     */
    async _fetchAutoconsentSetting() {
        if (!hasDdgApi()) {
            // No browser to ask - an unpacked dev build or the integration
            // tests. The standalone defaults are what we want there.
            return super.checkAutoconsentSetting();
        }
        const result = await sendToBrowser(FEATURE_NAME, 'getSettings');
        if (!result) {
            // The browser is there but did not answer. Stay off rather than act
            // against a setting the user may well have turned off; the TTL above
            // means we ask again shortly.
            return { enabled: false, featureFlags: {} };
        }
        if (typeof result.enabled !== 'boolean') {
            // The browser answered but is not speaking this protocol: with no
            // routing behind `ddg.send()` it simply echoes what it was sent.
            // Behave as if there were no browser at all, so vendoring this
            // extension ahead of the browser-side handler is not a regression.
            return super.checkAutoconsentSetting();
        }
        return {
            enabled: result.enabled,
            userPreference: result.userPreference,
            featureFlags: result.featureFlags ?? {},
        };
    }

    /**
     * Report a handled cookie popup. What the browser does with it is the
     * browser's business - today it draws the animation in its own chrome,
     * which is why `showCpmAnimation` stays the inherited no-op instead of
     * being a second message about the same event.
     *
     * @param {number} tabId
     * @param {import('@duckduckgo/autoconsent').DoneMessage} msg
     */
    async notifyPopupHandled(tabId, msg) {
        await sendToBrowser(FEATURE_NAME, 'cookiePopupHandled', {
            tabId,
            cmp: msg.cmp,
            isCosmetic: msg.isCosmetic,
        });
    }
}
