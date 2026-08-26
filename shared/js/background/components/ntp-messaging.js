import browser from 'webextension-polyfill';
import { NewTabTrackerStats } from '../newtab-tracker-stats';
import { emitter, TrackerBlockedEvent } from '../before-request';
import { NTP_PORT_NAME, NTP_MESSAGING_CONTEXT, NTP_FEATURE_NAME, NTP_OTHER_COMPANY_IDENTIFIER } from '../../ntp/constants';

/**
 * @typedef {import('../settings.js')} Settings
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
 * For now only the 'protections' widget is enabled, backed by the same
 * aggregated tracker stats that power the duckduckgo.com New Tab Page on
 * Chrome (see NewTabTrackerStats). Activity/history data and bridging to
 * native data sources will follow.
 */
export default class NTPMessaging {
    /** @type {Set<Port>} */
    ports = new Set();

    /** @type {ReturnType<typeof setTimeout>?} */
    _pushTimer = null;

    /**
     * @param {{ settings: Settings }} options
     */
    constructor({ settings }) {
        this.settings = settings;

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

        // Push updated stats to any open NTPs as trackers are blocked.
        emitter.on(TrackerBlockedEvent.eventName, () => {
            this.schedulePushDataUpdate();
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
                    locale: getLocale(),
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
            // The activity feed is not populated yet: return valid, empty
            // responses for both the plain and batched activity APIs.
            case 'activity_getData':
                return { activity: [] };
            case 'activity_getUrls':
                return { urls: [], totalTrackersBlocked: this.getProtectionsData().totalCount };
            case 'activity_getDataForUrls':
                return { activity: [] };
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
                // telemetryEvent, contextMenu, stats_showMore/showLess etc. -
                // accepted but not acted upon yet.
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
     * Trailing throttle for data update pushes, so a burst of blocked
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

function getLocale() {
    try {
        return browser.i18n.getUILanguage().split('-')[0];
    } catch (e) {
        return 'en';
    }
}
