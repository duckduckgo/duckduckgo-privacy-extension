import { CPMStandaloneMessaging } from './cpm-standalone-messaging';
import { SETTING_CHECK_TTL } from './cpm-embedded-messaging';
import { hasDdgApi, sendToBrowser } from './ddg-api-messaging';

/**
 * @typedef {import('./cookie-prompt-management').AutoconsentUserSettings} AutoconsentUserSettings
 */

const FEATURE_NAME = 'autoconsent';

/**
 * CPM messaging for the extension bundled into DDG-branded Chromium.
 *
 * Two calls go over `chrome.ddg` because only the browser can answer them: the
 * user's cookie-popup setting, which lives in browser prefs, and the report
 * that a popup was handled, which the browser renders in its own chrome.
 * Everything else stays extension-side as in the standalone build.
 */
export class CPMChromiumEmbeddedMessaging extends CPMStandaloneMessaging {
    /** @param {{ remoteConfig: import('./remote-config').default }} opts */
    constructor(opts) {
        super(opts);
        /** @type {{ time: number, value: Promise<AutoconsentUserSettings> } | null} */
        this._settingsCache = null;
    }

    /**
     * Read the cookie-popup setting from browser prefs, cached for
     * SETTING_CHECK_TTL. Failures are cached too.
     *
     * Caches the in-flight promise rather than the settled answer, so that the
     * frames of one page — which all reach CPM's `init` at once — share a single
     * call. Neither path below rejects.
     *
     * @returns {Promise<AutoconsentUserSettings>}
     */
    async checkAutoconsentSetting() {
        if (this._settingsCache && Date.now() - this._settingsCache.time < SETTING_CHECK_TTL) {
            return this._settingsCache.value;
        }
        this._settingsCache = { time: Date.now(), value: this._fetchAutoconsentSetting() };
        return this._settingsCache.value;
    }

    /**
     * @returns {Promise<AutoconsentUserSettings>}
     */
    async _fetchAutoconsentSetting() {
        if (!hasDdgApi()) {
            // An unpacked dev build or the integration tests: use the
            // standalone defaults.
            return super.checkAutoconsentSetting();
        }
        const result = await sendToBrowser(FEATURE_NAME, 'getSettings');
        if (!result) {
            // The browser is there but went quiet. Stay off rather than act
            // against a setting the user may have turned off; the TTL means we
            // ask again shortly.
            return { enabled: false, featureFlags: {} };
        }
        if (typeof result.enabled !== 'boolean') {
            // The browser cannot serve this method, so fall back to the
            // defaults as if there were no browser at all.
            return super.checkAutoconsentSetting();
        }
        return {
            enabled: result.enabled,
            userPreference: result.userPreference,
            featureFlags: result.featureFlags ?? {},
        };
    }

    /**
     * Report a handled cookie popup, which the browser records against the tab
     * to render in its own chrome. `tabId` is the `chrome.tabs.*` id; the
     * browser drops ids that name no tab of its own.
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
