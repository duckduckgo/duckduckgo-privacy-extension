import browser from 'webextension-polyfill';
import { NewTabTrackerStats } from '../newtab-tracker-stats';
import { emitter, TrackerBlockedEvent } from '../before-request';
import { getUserLocale } from '../i18n';
import { getBaseDomain } from '../utils';
import { getFromSessionStorage, setToSessionStorage } from '../wrapper';
import { pageDomain } from './ntp-activity';
import {
    NTP_PORT_NAME,
    NTP_RECONNECT_MESSAGE,
    NTP_MESSAGING_CONTEXT,
    NTP_FEATURE_NAME,
    NTP_OTHER_COMPANY_IDENTIFIER,
} from '../../ntp/constants';

/**
 * @typedef {typeof import('../settings.js')} Settings
 * @typedef {import('webextension-polyfill').Runtime.Port} Port
 * @typedef {import('./ntp-activity').default} NTPActivity
 * @typedef {import('./ntp-activity').SiteActivity} SiteActivity
 */

// Mirrors of the C-S-S NTP message types (special-pages/pages/new-tab/types/new-tab.ts).
// TODO: import them from C-S-S once new-tab.ts resolves outside C-S-S; its
// `declare module "../src/index.js"` augmentation currently breaks our tsc.
/**
 * @typedef {{ id: string, visibility: 'visible' | 'hidden' }} WidgetConfig
 * @typedef {{ totalCount: number, totalCookiePopUpsBlocked?: number | null }} ProtectionsData
 * @typedef {{ displayName: string, count: number }} TrackerCompany
 * @typedef {{ trackerCompanies: TrackerCompany[] }} PrivacyStatsData
 * @typedef {{ urls: string[], totalTrackersBlocked: number }} UrlInfo
 * @typedef {{
 *  title: string,
 *  url: string,
 *  etldPlusOne: string,
 *  favicon: null | { src: string, maxAvailableSize?: number },
 *  trackingStatus: { trackerCompanies: { displayName: string }[], totalCount: number },
 *  trackersFound: boolean,
 *  history: { title: string, url: string, relativeTime: string }[],
 *  favorite: boolean,
 * }} DomainActivity
 */

/** Settings keys used to persist NTP UI configuration. */
const FAVORITES_CONFIG_SETTING = 'ntpFavoritesConfig';
const PROTECTIONS_CONFIG_SETTING = 'ntpProtectionsConfig';

/**
 * Which of the page's widgets are shown: its Sections, as duck://settings shows them.
 * @typedef {{ search: boolean, favorites: boolean, protections: boolean }} Sections
 * @typedef {'light' | 'dark' | 'system'} Theme
 * @typedef {{ theme: Theme, sections: Sections, duckAiInSearch: boolean }} NewTabPageSettings
 */

// The browser's prefs for the page's choices, which duck://settings shares, read and set
// through chrome.settingsPrivate. The browser lets the bundled extension reach only these.
/** @type {Record<keyof Sections, string>} */
const SECTION_PREFS = {
    search: 'ddg.new_tab_page.search.visible',
    favorites: 'ddg.new_tab_page.favorites.visible',
    protections: 'ddg.new_tab_page.protections_report.visible',
};
const DUCK_AI_IN_SEARCH_PREF = 'ddg.new_tab_page.search.duck_ai.visible';
// The browser color scheme, which re-themes the browser when set.
const THEME_PREF = 'browser.theme.color_scheme2';
// The page's theme by the browser color scheme's value (ThemeService::BrowserColorScheme).
/** @type {Theme[]} */
const THEMES = ['system', 'light', 'dark'];

// The page's widget for each of the browser's Sections, in the order the page shows them.
/** @type {Record<keyof Sections, string>} */
const SECTION_WIDGETS = {
    search: 'omnibar',
    favorites: 'favorites',
    protections: 'protections',
};
const WIDGETS = Object.values(SECTION_WIDGETS).map((id) => ({ id }));
const WIDGET_SECTIONS = /** @type {Record<string, keyof Sections>} */ (
    Object.fromEntries(Object.entries(SECTION_WIDGETS).map(([section, id]) => [id, section]))
);
// The parts of the omnibar config the browser does not store. It opens in search
// mode, and Duck.ai's setting is on duck://settings, not in the page.
const OMNIBAR_CONFIG = {
    mode: 'search',
    showAiSetting: false,
    enableRecentAiChats: false,
};
// The settings the browser stores: each page message that changes one, and the
// update message every page is sent with its new value.
/** @type {Record<string, string>} */
const BROWSER_SETTINGS = {
    widgets_setConfig: 'widgets_onConfigUpdated',
    customizer_setTheme: 'customizer_onThemeUpdate',
    omnibar_setConfig: 'omnibar_onConfigUpdate',
};
// The update message each of the browser's prefs is sent to the pages as.
/** @type {Record<string, string>} */
const PREF_UPDATES = {
    ...Object.fromEntries(Object.values(SECTION_PREFS).map((pref) => [pref, BROWSER_SETTINGS.widgets_setConfig])),
    [THEME_PREF]: BROWSER_SETTINGS.customizer_setTheme,
    [DUCK_AI_IN_SEARCH_PREF]: BROWSER_SETTINGS.omnibar_setConfig,
};
// The parts of the customizer the browser does not store: the page's defaults.
const DEFAULT_CUSTOMIZER = { userColor: null, background: { kind: 'default' }, userImages: [] };
const DEFAULT_FAVORITES_CONFIG = { expansion: 'expanded' };
const DEFAULT_PROTECTIONS_CONFIG = { expansion: 'expanded', feed: 'privacy-stats' };

const SEARCH_URL = 'https://duckduckgo.com/';
const FAVICON_SIZE = 64;
/** The most pages the page lists for a site. */
const MAX_SITE_HISTORY = 10;
const relativeTimeFormat = new Intl.RelativeTimeFormat(getUserLocale());
const JUST_NOW = new Intl.RelativeTimeFormat(getUserLocale(), { numeric: 'auto' }).format(0, 'second');
/** Session storage key for the favorite URLs the activity feed's stars were last given. */
const STARRED_URLS_KEY = 'ntpStarredUrls';

/**
 * `chrome.ddg`; throws where the browser does not provide it.
 */
function ddgApi() {
    if (!chrome.ddg) {
        throw new Error('chrome.ddg is unavailable');
    }
    return chrome.ddg;
}

/**
 * `chrome.settingsPrivate`; throws where the browser does not provide it.
 */
function settingsApi() {
    if (!chrome.settingsPrivate) {
        throw new Error('chrome.settingsPrivate is unavailable');
    }
    return chrome.settingsPrivate;
}

/**
 * Messaging endpoint for the New Tab Page, over the runtime port opened by
 * shared/js/ntp/interop-shim.js:
 *  - requests arrive as `{Feature, SubFeatureName, Name, Data, Id}` and are
 *    answered with `{context, featureName, id, result|error}`;
 *  - subscription events are pushed to all connected pages as
 *    `{context, featureName, subscriptionName, params}`.
 *
 * Privacy stats come from NewTabTrackerStats, favorites from the browser's
 * bookmarks over chrome.ddg and the activity feed from NTPActivity; suggestions
 * are empty. The theme, which widgets show and whether Duck.ai shows in the
 * omnibar are the browser's prefs, through chrome.settingsPrivate, the same
 * choices duck://settings makes.
 */
export default class NTPMessaging {
    /** @type {Set<Port>} */
    ports = new Set();

    /** @type {ReturnType<typeof setTimeout>?} */
    pushTimer = null;

    /** @type {ReturnType<typeof setTimeout>?} */
    activityPushTimer = null;

    /**
     * Domains whose activity changed since the last activity push.
     * @type {Set<string>}
     */
    changedDomains = new Set();

    /**
     * The updates for the browser's settings waiting to be sent to the pages.
     * @type {Set<string>}
     */
    queuedSettingsUpdates = new Set();

    /**
     * @param {{
     *  settings: Settings,
     *  newTabTrackerStats: NewTabTrackerStats,
     *  statsRestored?: Promise<void>,
     *  ntpActivity: NTPActivity,
     * }} options - `statsRestored` resolves once `newTabTrackerStats` has been restored from storage
     */
    constructor({ settings, newTabTrackerStats, statsRestored = Promise.resolve(), ntpActivity }) {
        this.settings = settings;
        this.newTabTrackerStats = newTabTrackerStats;
        this.ntpActivity = ntpActivity;

        browser.runtime.onConnect.addListener((port) => {
            if (port.name !== NTP_PORT_NAME) return;
            this.ports.add(port);
            port.onMessage.addListener((msg) => {
                this.onMessage(msg, port);
            });
            port.onDisconnect.addListener(() => {
                this.ports.delete(port);
            });
            // Favorites and the browser's settings may have changed while a reconnecting
            // page had no port, as the browser's changes reach only connected pages.
            this.pushFavoritesUpdate([port]);
            this.pushBrowserSettings([port]);
        });

        // The theme, Sections and Duck.ai prefs, wherever they were changed: any page's
        // customize panel or duck://settings. Every page is sent each change, the page
        // that made it included. Top level, so the browser can wake the worker to deliver
        // it. It reports any shared pref, Chromium's own too, so the rest are ignored.
        if (chrome.settingsPrivate?.onPrefsChanged) {
            chrome.settingsPrivate.onPrefsChanged.addListener((prefs) => this.queueBrowserSettingsPush(prefs.map(({ key }) => key)));
        } else {
            console.error('chrome.settingsPrivate.onPrefsChanged is unavailable: open New Tab Pages will not see their settings change');
        }

        // Top level, so the browser can wake the worker to deliver it.
        if (chrome.ddg?.onFavoritesChanged) {
            chrome.ddg.onFavoritesChanged.addListener(async () => {
                try {
                    const [, favoriteUrls] = await Promise.all([this.pushFavoritesUpdate(), getFavoriteUrls()]);
                    const starred = await swapStarredUrls(favoriteUrls);
                    const changed = [...favoriteUrls, ...starred].filter((url) => favoriteUrls.has(url) !== starred.has(url));
                    this.queueActivityPush(changed.map(pageDomain));
                } catch (e) {
                    console.error('NTP activity_onDataPatch failed:', e);
                }
            });
        } else {
            console.error('chrome.ddg.onFavoritesChanged is unavailable: open New Tab Pages will not see favorites change');
        }

        // At most one push a second while trackers are being blocked. Scheduled even with no
        // pages connected, as open pages reconnect after the event that started the worker.
        emitter.on(TrackerBlockedEvent.eventName, () => {
            if (this.pushTimer) return;
            this.pushTimer = setTimeout(() => {
                this.pushTimer = null;
                this.pushDataUpdate();
            }, 1000);
        });

        ntpActivity.addEventListener('change', (event) => this.queueActivityPush(/** @type {CustomEvent<string[]>} */ (event).detail));

        // As on Windows, a burn empties the tracker total and company list, here and in
        // storage, and pushes that at once. Not before the restore, which would undo it.
        if (chrome.ddg?.onBurnStarted) {
            chrome.ddg.onBurnStarted.addListener(async () => {
                await statsRestored;
                newTabTrackerStats.stats.clearAll();
                this.pushDataUpdate();
                await newTabTrackerStats.syncToStorage();
            });
        } else {
            console.error('chrome.ddg.onBurnStarted is unavailable: New Tab Pages will keep their tracker stats through a burn');
        }

        // Pages left open while the service worker was stopped have lost their port.
        browser.runtime.sendMessage({ [NTP_RECONNECT_MESSAGE]: true }).catch(() => {});
    }

    /**
     * @param {any} msg
     * @param {Port} port
     */
    async onMessage(msg, port) {
        const { Feature: context, SubFeatureName: featureName, Name: method, Data: params, Id: id } = msg;
        if (context !== NTP_MESSAGING_CONTEXT || featureName !== NTP_FEATURE_NAME) {
            return;
        }
        if (id) {
            try {
                const result = await this.handleRequest(method, params, port);
                port.postMessage({ context, featureName, id, result });
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                port.postMessage({ context, featureName, id, error: { message } });
            }
        } else {
            try {
                await this.handleNotification(method, params, port);
            } catch (e) {
                console.error(`NTP ${method} failed:`, e);
            }
        }
    }

    /**
     * @param {string} method
     * @param {any} [params]
     * @param {Port} [port]
     * @returns {Promise<any>}
     */
    async handleRequest(method, params, port) {
        switch (method) {
            case 'initialSetup': {
                const [settings, autoOpen] = await Promise.all([getSettings(), customizerRequested(port)]);
                return {
                    widgets: WIDGETS,
                    widgetConfigs: toWidgetConfigs(settings.sections),
                    customizer: { ...DEFAULT_CUSTOMIZER, theme: settings.theme },
                    settings: { customizerDrawer: { state: 'enabled', autoOpen } },
                    platform: { name: 'windows' },
                    env: 'production',
                    locale: getUserLocale(),
                    updateNotification: null,
                };
            }

            // Omnibar
            case 'omnibar_getConfig':
                return toOmnibarConfig((await getSettings()).duckAiInSearch);
            case 'omnibar_getSuggestions':
                return { suggestions: { topHits: [], duckduckgoSuggestions: [], localSuggestions: [] } };

            // Favorites
            case 'favorites_getConfig':
                await this.settings.ready();
                return this.settings.getSetting(FAVORITES_CONFIG_SETTING) || DEFAULT_FAVORITES_CONFIG;
            case 'favorites_getData':
                return this.getFavoritesData();

            // Protections
            case 'protections_getConfig':
                await this.settings.ready();
                return this.settings.getSetting(PROTECTIONS_CONFIG_SETTING) || DEFAULT_PROTECTIONS_CONFIG;
            case 'protections_getData':
                return this.getProtectionsData();
            case 'stats_getData':
                return this.getPrivacyStatsData();
            case 'activity_getUrls':
                return toUrlInfo(await this.ntpActivity.getSites());
            case 'activity_getDataForUrls':
                return this.getActivityData(params?.urls);

            default:
                throw new Error(`unhandled NTP request: ${method}`);
        }
    }

    /**
     * @param {string} method
     * @param {any} [params]
     * @param {Port} [port]
     */
    async handleNotification(method, params, port) {
        switch (method) {
            // The browser stores these, and tells the worker each change, which every open
            // page is then sent.
            case 'widgets_setConfig':
            case 'customizer_setTheme':
            case 'omnibar_setConfig':
                try {
                    await setBrowserSetting(method, params);
                } catch (e) {
                    // No change is reported for one that was refused, so undo the page's.
                    if (port) {
                        await this.pushBrowserSettings([port], [BROWSER_SETTINGS[method]]);
                    }
                    throw e;
                }
                break;
            case 'contextMenu': {
                const tabId = port?.sender?.tab?.id;
                const items = params?.visibilityMenuItems;
                if (tabId === undefined || !Array.isArray(items)) {
                    throw new Error('the context menu has no tab to open over or no items');
                }
                const configs = toWidgetConfigs((await getSettings()).sections);
                const chosen = await ddgApi().showContextMenu(
                    tabId,
                    items.map(({ id, title }) => ({
                        id,
                        title,
                        checked: configs.some((config) => config.id === id && config.visibility === 'visible'),
                    })),
                );
                const section = chosen && WIDGET_SECTIONS[chosen];
                if (section) {
                    // Toggles the widget as it is once the menu closes. The browser's change
                    // tells the pages.
                    const { sections } = await getSettings();
                    await setPref(SECTION_PREFS[section], !sections[section]);
                }
                break;
            }

            // Omnibar
            case 'omnibar_submitSearch':
                if (typeof params?.term === 'string') {
                    this.openUrl(`${SEARCH_URL}?q=${encodeURIComponent(params.term)}`, params?.target, port);
                }
                break;
            case 'omnibar_openSuggestion': {
                const suggestion = params?.suggestion;
                if (suggestion?.kind === 'phrase') {
                    this.openUrl(`${SEARCH_URL}?q=${encodeURIComponent(suggestion.phrase)}`, params?.target, port);
                } else {
                    this.openUrl(suggestion?.url, params?.target, port);
                }
                break;
            }

            // Favorites
            case 'favorites_setConfig':
                await this.settings.ready();
                this.settings.updateSetting(FAVORITES_CONFIG_SETTING, params);
                break;
            case 'favorites_open':
                this.openUrl(params?.url, params?.target, port, false);
                break;
            case 'favorites_move':
                // The page has already moved it; onFavoritesChanged echoes the order back.
                if (typeof params?.id === 'string' && Number.isInteger(params?.targetIndex)) {
                    try {
                        await ddgApi().moveFavorite(params.id, params.targetIndex);
                    } catch (e) {
                        // Undo the page's move.
                        await this.pushFavoritesUpdate();
                        throw e;
                    }
                }
                break;
            case 'favorites_add': {
                // The browser's bookmark dialog adds it; onFavoritesChanged brings it back.
                const tabId = port?.sender?.tab?.id;
                if (tabId === undefined || !(await ddgApi().showAddFavoriteBubble(tabId))) {
                    throw new Error('the add favorite dialog did not open');
                }
                break;
            }

            // Protections
            case 'protections_setConfig':
                await this.settings.ready();
                this.settings.updateSetting(PROTECTIONS_CONFIG_SETTING, params);
                // As on Windows, every open page is sent the new config, the sender included.
                this.pushSubscriptionEvent('protections_onConfigUpdate', params);
                break;
            case 'activity_open':
                this.openUrl(params?.url, params?.target, port, false);
                break;
            case 'activity_removeItem':
                await this.ntpActivity.removeDomain(pageDomain(params?.url));
                break;
            // The page has already toggled the star; pushing the site puts it back if that fails.
            case 'activity_addFavorite':
                if (typeof params?.url === 'string') {
                    const domain = pageDomain(params.url);
                    const site = (await this.ntpActivity.getSites()).get(domain);
                    // A new bookmark is titled like the site's latest page, as on Windows.
                    const title = site?.pages[0].title.trim() || domain;
                    try {
                        await ddgApi().addFavorite(params.url, title);
                    } catch (e) {
                        this.queueActivityPush([domain]);
                        throw e;
                    }
                }
                break;
            case 'activity_removeFavorite':
                if (typeof params?.url === 'string') {
                    try {
                        await ddgApi().removeFavorite(params.url);
                    } catch (e) {
                        this.queueActivityPush([pageDomain(params.url)]);
                        throw e;
                    }
                }
                break;

            case 'reportInitException':
            case 'reportPageException':
                console.error(`NTP ${method}:`, params?.message);
                break;
            default:
                // favorites_openContextMenu, telemetryEvent etc.
                console.log(`NTP notification (ignored): ${method}`, params);
        }
    }

    /**
     * @param {unknown} url
     * @param {string} [target] - 'same-tab' targets the NTP's own tab and 'new-window' a
     *   new window; otherwise a new tab opens directly to the right of the NTP
     * @param {Port} [port] - the connection the request arrived on
     * @param {boolean} [active] - whether that new tab is selected
     */
    openUrl(url, target, port, active = true) {
        if (typeof url !== 'string') return;
        const tab = port?.sender?.tab;
        if (target === 'new-window') {
            browser.windows.create({ url });
        } else if (!tab?.id) {
            browser.tabs.create({ url, active });
        } else if (target === 'same-tab') {
            browser.tabs.update(tab.id, { url });
        } else {
            browser.tabs.create({ url, active, windowId: tab.windowId, index: tab.index + 1, openerTabId: tab.id });
        }
    }

    /**
     * Sends the pages the browser's settings, as the browser's changes to them would be.
     * @param {Iterable<Port>} ports - the pages' connections
     * @param {string[]} [subscriptionNames] - the updates to send, by default all of them
     */
    async pushBrowserSettings(ports, subscriptionNames = Object.values(BROWSER_SETTINGS)) {
        try {
            const settings = await getSettings();
            /** @type {Record<string, any>} */
            const updates = {
                widgets_onConfigUpdated: toWidgetConfigs(settings.sections),
                customizer_onThemeUpdate: { theme: settings.theme },
                omnibar_onConfigUpdate: toOmnibarConfig(settings.duckAiInSearch),
            };
            for (const name of subscriptionNames) {
                this.pushSubscriptionEvent(name, updates[name], ports);
            }
        } catch (e) {
            console.error("NTP: the browser's settings were not sent to the pages:", e);
        }
    }

    /**
     * Sends every open page the updates for the prefs `keys`, which the browser reports
     * changed. The browser reports each pref on its own, so a change to several Sections
     * arrives as several reports, but the pages are sent the prefs as they are now, read
     * once the reports that arrive together are in, never a change half made: the
     * worker sets the Sections of one change all at once, so by the time the first
     * report arrives, the browser has the rest of the change to apply ahead of the read.
     * @param {string[]} keys
     */
    queueBrowserSettingsPush(keys) {
        const names = keys.map((key) => PREF_UPDATES[key]).filter(Boolean);
        if (!names.length) return;
        const queued = this.queuedSettingsUpdates.size > 0;
        names.forEach((name) => this.queuedSettingsUpdates.add(name));
        if (queued) return;
        setTimeout(() => {
            const updates = [...this.queuedSettingsUpdates];
            // Cleared before the read, so a report during it is read again rather than lost.
            this.queuedSettingsUpdates.clear();
            this.pushBrowserSettings(this.ports, updates);
        });
    }

    /**
     * @returns {ProtectionsData}
     */
    getProtectionsData() {
        // null: the current report UI, without cookie pop-up stats
        return { totalCount: this.newTabTrackerStats.stats.totalCount, totalCookiePopUpsBlocked: null };
    }

    /**
     * @returns {PrivacyStatsData}
     */
    getPrivacyStatsData() {
        const trackerCompanies = this.newTabTrackerStats.stats.sorted(Date.now()).map(({ key, count }) => ({
            displayName: key === NewTabTrackerStats.otherCompaniesKey ? NTP_OTHER_COMPANY_IDENTIFIER : key,
            count,
        }));
        // the page expects the aggregated 'other' entry at the end of the list
        const otherIndex = trackerCompanies.findIndex(({ displayName }) => displayName === NTP_OTHER_COMPANY_IDENTIFIER);
        if (otherIndex > -1) {
            trackerCompanies.push(...trackerCompanies.splice(otherIndex, 1));
        }
        return { trackerCompanies };
    }

    /**
     * Favorites in the page's format.
     */
    async getFavoritesData() {
        const favorites = await ddgApi().getFavorites();
        return {
            favorites: favorites.map(({ id, title, url }) => ({
                id,
                title,
                url,
                etldPlusOne: getBaseDomain(url),
                favicon: favicon(url),
            })),
        };
    }

    /**
     * @param {Iterable<Port>} [ports]
     */
    async pushFavoritesUpdate(ports = this.ports) {
        try {
            this.pushSubscriptionEvent('favorites_onDataUpdate', await this.getFavoritesData(), ports);
        } catch (e) {
            console.error('NTP favorites_onDataUpdate failed:', e);
        }
    }

    /**
     * @param {unknown} urls - site URLs, as listed by activity_getUrls
     * @returns {Promise<{ activity: DomainActivity[] }>}
     */
    async getActivityData(urls) {
        const [sites, favoriteUrls] = await Promise.all([this.ntpActivity.getSites(), getFavoriteUrls()]);
        await setToSessionStorage(STARRED_URLS_KEY, [...favoriteUrls]);
        const activity = [];
        for (const url of Array.isArray(urls) ? urls : []) {
            const domain = pageDomain(url);
            const site = sites.get(domain);
            if (site) {
                activity.push(toDomainActivity(url, domain, site, favoriteUrls.has(url)));
            }
        }
        return { activity };
    }

    pushDataUpdate() {
        this.pushSubscriptionEvent('protections_onDataUpdate', this.getProtectionsData());
        this.pushSubscriptionEvent('stats_onDataUpdate', this.getPrivacyStatsData());
    }

    /**
     * Push the activity of the given domains within a second, at most one push a second.
     * @param {string[]} domains
     */
    queueActivityPush(domains) {
        domains.forEach((domain) => this.changedDomains.add(domain));
        this.activityPushTimer ||= setTimeout(() => {
            this.activityPushTimer = null;
            const changed = [...this.changedDomains];
            this.changedDomains.clear();
            this.pushActivityUpdate(changed).catch((e) => console.error('NTP activity_onDataPatch failed:', e));
        }, 1000);
    }

    /**
     * Push the activity feed's URLs, with each of the given domains that still
     * has activity as a patch.
     * @param {string[]} changedDomains
     */
    async pushActivityUpdate(changedDomains) {
        if (this.ports.size === 0) return;
        const [sites, favoriteUrls] = await Promise.all([this.ntpActivity.getSites(), getFavoriteUrls()]);
        const urlInfo = toUrlInfo(sites);
        let patched = false;
        for (const domain of new Set(changedDomains)) {
            const site = sites.get(domain);
            if (!site) continue;
            const url = siteUrl(domain, site);
            this.pushSubscriptionEvent('activity_onDataPatch', {
                ...urlInfo,
                patch: toDomainActivity(url, domain, site, favoriteUrls.has(url)),
            });
            patched = true;
        }
        if (!patched) {
            this.pushSubscriptionEvent('activity_onDataPatch', urlInfo);
        }
    }

    /**
     * @param {string} subscriptionName
     * @param {any} params
     * @param {Iterable<Port>} [ports]
     */
    pushSubscriptionEvent(subscriptionName, params, ports = this.ports) {
        for (const port of ports) {
            // A page that has just closed throws, and must not stop the rest getting it.
            try {
                port.postMessage({
                    context: NTP_MESSAGING_CONTEXT,
                    featureName: NTP_FEATURE_NAME,
                    subscriptionName,
                    params,
                });
            } catch (e) {
                console.error(`NTP ${subscriptionName} not sent to a page:`, e);
            }
        }
    }
}

/**
 * Whether the browser asked for the page to open with the customizer showing.
 * Only decides that, so any failure (no tab, chrome.ddg missing, the browser
 * refusing a tab not yet showing the New Tab Page) is false, not a page that
 * fails to load.
 * @param {Port | undefined} port - the page's connection
 * @returns {Promise<boolean>}
 */
async function customizerRequested(port) {
    try {
        const tabId = port?.sender?.tab?.id;
        if (tabId === undefined) {
            throw new Error('the page has no tab');
        }
        return await ddgApi().isNewTabPageCustomizerRequested(tabId);
    } catch (e) {
        console.warn('NTP customizer auto-open unknown, leaving it closed:', e);
        return false;
    }
}

/**
 * @param {string} name
 * @returns {Promise<unknown>} the browser's value for pref `name`
 */
async function getPref(name) {
    return (await settingsApi().getPref(name)).value;
}

/**
 * Sets pref `name`; throws if the browser refuses it.
 * @param {string} name
 * @param {unknown} value
 */
async function setPref(name, value) {
    if (!(await settingsApi().setPref(name, value))) {
        throw new Error(`the browser refused ${name}`);
    }
}

/**
 * @returns {Promise<NewTabPageSettings>} the browser's New Tab Page choices
 */
async function getSettings() {
    const [search, favorites, protections, duckAiInSearch, scheme] = await Promise.all(
        [SECTION_PREFS.search, SECTION_PREFS.favorites, SECTION_PREFS.protections, DUCK_AI_IN_SEARCH_PREF, THEME_PREF].map(getPref),
    );
    return {
        // Only a damaged pref holds anything else.
        theme: THEMES[/** @type {number} */ (scheme)] ?? 'system',
        sections: { search: search === true, favorites: favorites === true, protections: protections === true },
        duckAiInSearch: duckAiInSearch === true,
    };
}

/**
 * Sets the browser color scheme; throws, changing nothing, for anything but
 * light, dark and system.
 * @param {unknown} theme
 */
async function setTheme(theme) {
    const scheme = THEMES.indexOf(/** @type {Theme} */ (theme));
    if (scheme < 0) {
        throw new Error('theme must be light, dark or system');
    }
    await setPref(THEME_PREF, scheme);
}

/**
 * @param {Sections} sections
 * @returns {WidgetConfig[]} the page's widget configs for the browser's Sections
 */
function toWidgetConfigs(sections) {
    return Object.entries(SECTION_WIDGETS).map(([section, id]) => ({
        id,
        visibility: sections[/** @type {keyof Sections} */ (section)] ? 'visible' : 'hidden',
    }));
}

/**
 * @param {unknown} configs - the page's widget configs
 * @returns {Partial<Sections>} the Sections they change; throws, so nothing
 *   changes, unless each names one of them, visible or hidden
 */
function toSectionsChange(configs) {
    if (!Array.isArray(configs)) {
        throw new Error('expected a list of widget configs');
    }
    /** @type {Partial<Sections>} */
    const change = {};
    for (const config of configs) {
        const section = Object.prototype.hasOwnProperty.call(WIDGET_SECTIONS, config?.id) && WIDGET_SECTIONS[config.id];
        if (!section) {
            throw new Error(`unknown widget id "${config?.id}"`);
        }
        if (config.visibility !== 'visible' && config.visibility !== 'hidden') {
            throw new Error('visibility must be visible or hidden');
        }
        change[section] = config.visibility === 'visible';
    }
    return change;
}

/**
 * Makes the change a page's message asks the browser for.
 * @param {string} method - widgets_setConfig, customizer_setTheme or omnibar_setConfig
 * @param {any} params
 */
async function setBrowserSetting(method, params) {
    switch (method) {
        case 'widgets_setConfig': {
            // Every Section is set at once, which keeps the pages from being sent a
            // change half made (see queueBrowserSettingsPush).
            const change = toSectionsChange(params);
            await Promise.all(
                Object.entries(change).map(([section, visible]) =>
                    setPref(SECTION_PREFS[/** @type {keyof Sections} */ (section)], visible),
                ),
            );
            return;
        }
        case 'customizer_setTheme':
            // Theme variants are not supported, so the variant is ignored.
            return setTheme(params?.theme);
        case 'omnibar_setConfig':
            // The browser stores only `enableAi`; a config without it changes nothing there.
            if (params?.enableAi !== undefined) {
                if (typeof params.enableAi !== 'boolean') {
                    throw new Error('enableAi must be a boolean');
                }
                return setPref(DUCK_AI_IN_SEARCH_PREF, params.enableAi);
            }
    }
}

/**
 * The omnibar config always says search mode, so a page in Duck.ai mode returns
 * to search when the Duck.ai setting changes, as on Windows.
 * @param {boolean} duckAiInSearch - the browser's Duck.ai choice
 * @returns the page's omnibar config
 */
function toOmnibarConfig(duckAiInSearch) {
    return { ...OMNIBAR_CONFIG, enableAi: duckAiInSearch };
}

/**
 * The URL the page knows a domain by: https unless none of its pages are.
 * @param {string} domain
 * @param {SiteActivity} site
 * @returns {string}
 */
function siteUrl(domain, site) {
    return `${site.pages.some((page) => page.url.startsWith('https:')) ? 'https' : 'http'}://${domain}/`;
}

/**
 * @param {Map<string, SiteActivity>} sites
 * @returns {UrlInfo}
 */
function toUrlInfo(sites) {
    const urls = [];
    let totalTrackersBlocked = 0;
    for (const [domain, site] of sites) {
        urls.push(siteUrl(domain, site));
        totalTrackersBlocked += site.trackersBlocked;
    }
    return { urls, totalTrackersBlocked };
}

/**
 * @param {string} url - the site URL the page knows the domain by
 * @param {string} domain
 * @param {SiteActivity} site
 * @param {boolean} favorite
 * @returns {DomainActivity}
 */
function toDomainActivity(url, domain, site, favorite) {
    return {
        title: domain,
        url,
        etldPlusOne: getBaseDomain(url) || domain,
        favicon: favicon(site.pages[0].url),
        trackingStatus: {
            totalCount: site.trackersBlocked,
            trackerCompanies: site.companies.map((displayName) => ({ displayName })),
        },
        trackersFound: site.trackersFound,
        history: site.pages
            .filter((page) => page.title.trim())
            .slice(0, MAX_SITE_HISTORY)
            .map((page) => ({ title: page.title, url: page.url, relativeTime: relativeTime(page.lastVisitTime) })),
        favorite,
    };
}

/**
 * @returns {Promise<Set<string>>} the URLs of the favorites the browser shows
 */
async function getFavoriteUrls() {
    return new Set((await ddgApi().getFavorites()).map(({ url }) => url));
}

/**
 * Records `favoriteUrls` as the activity feed's stars. Kept for the session, as
 * the favorites change that wakes the worker must be compared with the stars the
 * page was given before it stopped.
 * @param {Set<string>} favoriteUrls
 * @returns {Promise<Set<string>>} the stars recorded before
 */
async function swapStarredUrls(favoriteUrls) {
    const starred = new Set((await getFromSessionStorage(STARRED_URLS_KEY)) || []);
    await setToSessionStorage(STARRED_URLS_KEY, [...favoriteUrls]);
    return starred;
}

/**
 * A page's icon from Chromium's favicon cache (the `favicon` permission). The page
 * appends `?preferredSize=N` to `src` verbatim; the trailing '&' keeps that out of `size`.
 * @param {string} pageUrl
 */
function favicon(pageUrl) {
    return { src: `/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${FAVICON_SIZE}&`, maxAvailableSize: FAVICON_SIZE };
}

/**
 * @param {number} time - in the past
 * @returns {string} e.g. "5 minutes ago"
 */
function relativeTime(time) {
    const minutes = Math.floor((Date.now() - time) / 60000);
    if (minutes < 1) return JUST_NOW;
    if (minutes < 60) return relativeTimeFormat.format(-minutes, 'minute');
    if (minutes < 24 * 60) return relativeTimeFormat.format(-Math.floor(minutes / 60), 'hour');
    return relativeTimeFormat.format(-Math.floor(minutes / (24 * 60)), 'day');
}
