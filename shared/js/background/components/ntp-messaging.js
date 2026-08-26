import browser from 'webextension-polyfill';
import { NewTabTrackerStats } from '../newtab-tracker-stats';
import { emitter, TrackerBlockedEvent } from '../before-request';
import { NTP_PORT_NAME, NTP_MESSAGING_CONTEXT, NTP_FEATURE_NAME, NTP_OTHER_COMPANY_IDENTIFIER } from '../../ntp/constants';

/**
 * @typedef {import('../settings.js')} Settings
 * @typedef {import('./ntp-activity.js').default} NTPActivityCollection
 * @typedef {import('../classes/ntp-activity-store.js').SiteActivityRow} SiteActivityRow
 * @typedef {import('webextension-polyfill').Runtime.Port} Port
 */

/** Settings keys used to persist NTP UI configuration. */
const PROTECTIONS_CONFIG_SETTING = 'ntpProtectionsConfig';
const WIDGET_CONFIGS_SETTING = 'ntpWidgetConfigs';

const DEFAULT_PROTECTIONS_CONFIG = {
    expansion: 'expanded',
    feed: 'privacy-stats',
    showBurnAnimation: false,
};
const DEFAULT_WIDGET_CONFIGS = [{ id: 'protections', visibility: 'visible' }];

/**
 * PoC messaging endpoint for the embedded New Tab Page (chromium-embedded
 * build only).
 *
 * The New Tab Page from @duckduckgo/content-scope-scripts is served as an
 * extension page (see the ntp/ directory of the build and
 * `chrome_url_overrides` in the manifest). Its 'windows' messaging transport
 * is bridged to the background over a runtime port by
 * shared/js/ntp/interop-shim.js, and this component answers those messages:
 *
 *  - requests arrive in the windows wire format
 *    `{Feature, SubFeatureName, Name, Data, Id}` and are answered with
 *    `{context, featureName, id, result|error}` on the same port;
 *  - subscription events are pushed to all connected NTP pages as
 *    `{context, featureName, subscriptionName, params}` - the page registers
 *    no subscriptions with us, it simply filters incoming events.
 *
 * For now only the 'protections' widget is enabled. Its summary feed is
 * backed by the same aggregated tracker stats that power the duckduckgo.com
 * New Tab Page on Chrome (see NewTabTrackerStats), and its activity
 * ("Details") feed by the per-site stats collected in NTPActivityCollection.
 */
export default class NTPMessaging {
    /** @type {Set<Port>} */
    ports = new Set();

    /** @type {ReturnType<typeof setTimeout>?} */
    _pushTimer = null;

    /**
     * @param {{ settings: Settings, ntpActivity: NTPActivityCollection }} options
     */
    constructor({ settings, ntpActivity }) {
        this.settings = settings;
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
        });

        // Push updated summary stats to any open NTPs as trackers are blocked.
        emitter.on(TrackerBlockedEvent.eventName, () => {
            this.schedulePushDataUpdate();
        });

        // Push per-site patches to the activity feed as data is collected.
        this.ntpActivity.onChange((hosts) => {
            this.pushActivityPatches(hosts);
        });
    }

    /**
     * Handle one incoming message from the NTP page, in the windows wire
     * format produced by the page's WindowsMessagingTransport.
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
                const result = await this.handleRequest(method, params);
                port.postMessage({ context, featureName, id, result });
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                port.postMessage({ context, featureName, id, error: { message } });
            }
        } else {
            await this.handleNotification(method, params, port);
        }
    }

    /**
     * @param {string} method
     * @param {any} [params]
     * @returns {Promise<any>}
     */
    async handleRequest(method, params) {
        switch (method) {
            case 'initialSetup': {
                await this.settings.ready();
                return {
                    widgets: [{ id: 'protections' }],
                    widgetConfigs: this.settings.getSetting(WIDGET_CONFIGS_SETTING) || DEFAULT_WIDGET_CONFIGS,
                    platform: { name: 'windows' },
                    env: 'production',
                    locale: getLocale().split('-')[0],
                    updateNotification: null,
                };
            }
            case 'protections_getConfig': {
                await this.settings.ready();
                return this.settings.getSetting(PROTECTIONS_CONFIG_SETTING) || DEFAULT_PROTECTIONS_CONFIG;
            }
            case 'protections_getData':
                return this.getProtectionsData();
            case 'stats_getData':
                return this.getPrivacyStatsData();
            case 'activity_getData': {
                const rows = await this.ntpActivity.store.getAll();
                return { activity: rows.map((row) => toDomainActivity(row)) };
            }
            case 'activity_getUrls':
                return await this.getActivityUrlInfo();
            case 'activity_getDataForUrls': {
                const rows = await this.ntpActivity.store.getForUrls(params?.urls || []);
                return { activity: rows.map((row) => toDomainActivity(row)) };
            }
            case 'activity_confirmBurn':
                // Burning (fire button) is not wired up yet.
                return { action: 'none' };
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
            case 'protections_setConfig':
                await this.settings.ready();
                this.settings.updateSetting(PROTECTIONS_CONFIG_SETTING, params);
                break;
            case 'widgets_setConfig':
                await this.settings.ready();
                this.settings.updateSetting(WIDGET_CONFIGS_SETTING, params);
                break;
            case 'activity_removeItem': {
                if (typeof params?.url === 'string') {
                    await this.ntpActivity.store.removeByUrl(params.url);
                    await this.pushActivityDataUpdate();
                }
                break;
            }
            case 'open': {
                const tabId = port?.sender?.tab?.id;
                if (typeof params?.url === 'string') {
                    if (params?.target === 'same-tab' && tabId) {
                        browser.tabs.update(tabId, { url: params.url });
                    } else {
                        browser.tabs.create({ url: params.url });
                    }
                }
                break;
            }
            case 'reportInitException':
            case 'reportPageException':
                console.error(`NTP ${method}:`, params?.message);
                break;
            default:
                // telemetryEvent, contextMenu, favorites, stats_showMore/showLess
                // etc. - accepted but not acted upon yet.
                console.log(`NTP notification (ignored): ${method}`, params);
        }
    }

    /**
     * @returns {{ totalCount: number }}
     */
    getProtectionsData() {
        return { totalCount: NewTabTrackerStats.shared?.stats.totalCount ?? 0 };
    }

    /**
     * @returns {{ trackerCompanies: { displayName: string, count: number }[] }}
     */
    getPrivacyStatsData() {
        const shared = NewTabTrackerStats.shared;
        if (!shared) {
            return { trackerCompanies: [] };
        }
        const trackerCompanies = shared.stats.sorted(Date.now()).map(({ key, count }) => ({
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
     * The site URL list + total for the activity feed's batched API. The
     * total is the last-7-days count (the store's retention window), unlike
     * protections_getData's install-time total.
     * @returns {Promise<{ urls: string[], totalTrackersBlocked: number }>}
     */
    async getActivityUrlInfo() {
        const rows = await this.ntpActivity.store.getAll();
        return {
            urls: rows.map((row) => row.url),
            totalTrackersBlocked: rows.reduce((total, row) => total + row.totalCount, 0),
        };
    }

    /**
     * Push single-site activity patches to connected NTP pages.
     * @param {string[]} hosts
     */
    async pushActivityPatches(hosts) {
        if (this.ports.size === 0) return;
        const urlInfo = await this.getActivityUrlInfo();
        for (const host of hosts) {
            const row = await this.ntpActivity.store.get(host);
            this.pushSubscriptionEvent('activity_onDataPatch', {
                ...urlInfo,
                patch: row ? toDomainActivity(row) : null,
            });
        }
    }

    /**
     * Push a full activity data update (e.g. after an item was removed).
     */
    async pushActivityDataUpdate() {
        if (this.ports.size === 0) return;
        const rows = await this.ntpActivity.store.getAll();
        this.pushSubscriptionEvent('activity_onDataUpdate', {
            activity: rows.map((row) => toDomainActivity(row)),
        });
    }

    /**
     * Trailing throttle for summary data update pushes, so a burst of blocked
     * trackers results in a single update to the page.
     */
    schedulePushDataUpdate() {
        if (this.ports.size === 0 || this._pushTimer) return;
        this._pushTimer = setTimeout(() => {
            this._pushTimer = null;
            this.pushDataUpdate();
        }, 1000);
    }

    pushDataUpdate() {
        this.pushSubscriptionEvent('protections_onDataUpdate', this.getProtectionsData());
        this.pushSubscriptionEvent('stats_onDataUpdate', this.getPrivacyStatsData());
    }

    /**
     * Broadcast a subscription event to all connected NTP pages.
     * @param {string} subscriptionName
     * @param {any} params
     */
    pushSubscriptionEvent(subscriptionName, params) {
        for (const port of this.ports) {
            port.postMessage({
                context: NTP_MESSAGING_CONTEXT,
                featureName: NTP_FEATURE_NAME,
                subscriptionName,
                params,
            });
        }
    }
}

/**
 * Map a stored site row to the NTP's DomainActivity format.
 * @param {SiteActivityRow} row
 * @param {number} [now] - current timestamp, overridable for tests
 */
export function toDomainActivity(row, now = Date.now()) {
    const trackerCompanies = Object.entries(row.companies)
        .sort((a, b) => b[1] - a[1])
        .map(([displayName]) => ({ displayName }));
    return {
        title: row.host,
        url: row.url,
        etldPlusOne: row.etldPlusOne,
        favicon: {
            // Chromium's favicon API, relative to the NTP extension page.
            // Requires the 'favicon' permission in the manifest.
            src: `/_favicon/?pageUrl=${encodeURIComponent(row.url)}&size=32`,
            maxAvailableSize: 32,
        },
        trackingStatus: {
            totalCount: row.totalCount,
            trackerCompanies,
        },
        trackersFound: row.totalCount > 0,
        history: row.history.map((entry) => ({
            title: entry.title,
            url: entry.url,
            relativeTime: formatRelativeTime(entry.visitedAt, now),
        })),
        favorite: false,
        cookiePopUpBlocked: null,
    };
}

/** @type {Intl.RelativeTimeFormat?} */
let relativeTimeFormatter = null;

/**
 * Format a timestamp as a localized, human readable relative time
 * (e.g. "now", "5 minutes ago", "yesterday").
 * @param {number} timestamp
 * @param {number} [now]
 * @returns {string}
 */
export function formatRelativeTime(timestamp, now = Date.now()) {
    if (!relativeTimeFormatter) {
        relativeTimeFormatter = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
    }
    const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
    if (seconds < 60) {
        return relativeTimeFormatter.format(0, 'second');
    }
    if (seconds < 60 * 60) {
        return relativeTimeFormatter.format(-Math.round(seconds / 60), 'minute');
    }
    if (seconds < 24 * 60 * 60) {
        return relativeTimeFormatter.format(-Math.round(seconds / (60 * 60)), 'hour');
    }
    return relativeTimeFormatter.format(-Math.round(seconds / (24 * 60 * 60)), 'day');
}

function getLocale() {
    try {
        return browser.i18n.getUILanguage();
    } catch (e) {
        return 'en';
    }
}
