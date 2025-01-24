import browser from 'webextension-polyfill';
import { MessageReceivedEvent } from './components/message-router';

/**
 * @typedef {import('./components/abn-experiments').default} AbnExperimentMetrics
 * @typedef {import('./components/message-router').default} MessageRouter
 */
export class AppUseMetric {
    /**
     * Metric that fires once on creation.
     * @param {{
     * abnMetrics: AbnExperimentMetrics
     * }} opts
     */
    constructor({ abnMetrics }) {
        // trigger on construction: happens whenever the service worker is spun up, which should correlate with browser activity.
        abnMetrics.remoteConfig.ready.then(() => abnMetrics.onMetricTriggered('app_use'));
    }
}

export class SearchMetric {
    /**
     * Metric that fires whenever a new search is made
     * @param {{
     * abnMetrics: AbnExperimentMetrics
     * }} opts
     */
    constructor({ abnMetrics }) {
        browser.webRequest.onCompleted.addListener(
            async (details) => {
                const params = new URL(details.url).searchParams;
                if (params.has('q') && (params.get('q')?.length || 0) > 0) {
                    await abnMetrics.remoteConfig.ready;
                    abnMetrics.onMetricTriggered('search');
                }
            },
            {
                urls: ['https://*.duckduckgo.com/*'],
                types: ['main_frame'],
            },
        );
    }
}

export class DashboardUseMetric {
    messageToMetricMap = {
        getPrivacyDashboardData: 'privacyDashboardOpen',
        setLists: 'protectionToggle',
        getBreakageFormOptions: 'breakageFormOpen',
        doBurn: 'fireButton',
        submitBrokenSiteReport: 'brokenSiteReport',
        sendToggleReport: 'toggleSiteReport',
    };

    /**
     * @param {{
     *  abnMetrics: AbnExperimentMetrics;
     *  messaging: MessageRouter
     * }} opts
     */
    constructor({ abnMetrics, messaging }) {
        messaging.addEventListener('messageReceived', (ev) => {
            if (ev instanceof MessageReceivedEvent) {
                if (this.messageToMetricMap[ev.messageType]) {
                    abnMetrics.onMetricTriggered(this.messageToMetricMap[ev.messageType]);
                }
            }
        });
    }
}

export class RefreshMetric {
    /** @type {Map<number, number[]>} */
    tabRefreshCounter = new Map();
    DEBOUNCE_MS = 500;

    /**
     *
     * @param {{
     *   abnMetrics: AbnExperimentMetrics,
     *   tabTracking: import('./components/tab-tracking').default,
     * }} opts
     */
    constructor({ abnMetrics, tabTracking }) {
        tabTracking.addEventListener('tabRefresh', (ev) => {
            if (ev instanceof CustomEvent) {
                const { tabId } = ev.detail;
                if (!this.tabRefreshCounter.has(tabId)) {
                    this.tabRefreshCounter.set(tabId, []);
                }
                const refreshCounter = this.tabRefreshCounter.get(tabId) || [];
                if (refreshCounter.length > 0 && refreshCounter[refreshCounter.length - 1] > Date.now() - this.DEBOUNCE_MS) {
                    // last refresh less than DEBOUNCE_MS ago, ignore
                    return;
                }
                refreshCounter.push(Date.now());

                // reload-twice-within-12-seconds
                const tMinus12s = Date.now() - 12000;
                if (refreshCounter.filter((t) => t > tMinus12s).length === 2) {
                    abnMetrics.onMetricTriggered('2xRefresh');
                }
                // reload-three-times-within-20-seconds
                const tMinus20s = Date.now() - 20000;
                if (refreshCounter.filter((t) => tMinus20s).length === 3) {
                    abnMetrics.onMetricTriggered('3xRefresh');
                }

                // clean up old refreshes
                while (refreshCounter.length > 0 && refreshCounter[0] < tMinus20s) {
                    refreshCounter.pop();
                }
                if (refreshCounter.length === 0) {
                    this.tabRefreshCounter.delete(tabId);
                }
            }
        });
    }
}

/**
 * Default set of metrics we want to send for breakage experiments, in compact
 * tuple format (so it's easy to modify).
 * @type {[string, number, number, number][]}
 */
const breakageMetricSpec = [
    ['2xRefresh', 0, 2, 1],
    ['2xRefresh', 0, 3, 1],
    ['2xRefresh', 0, 4, 1],
    ['2xRefresh', 0, 5, 1],
    ['2xRefresh', 0, 2, 5],
    ['2xRefresh', 0, 3, 5],
    ['2xRefresh', 0, 4, 5],
    ['2xRefresh', 0, 5, 5],
    ['2xRefresh', 0, 2, 10],
    ['2xRefresh', 0, 3, 10],
    ['2xRefresh', 0, 4, 10],
    ['2xRefresh', 0, 5, 10],
    ['3xRefresh', 0, 2, 1],
    ['3xRefresh', 0, 3, 1],
    ['3xRefresh', 0, 4, 1],
    ['3xRefresh', 0, 5, 1],
    ['3xRefresh', 0, 2, 5],
    ['3xRefresh', 0, 3, 5],
    ['3xRefresh', 0, 4, 5],
    ['3xRefresh', 0, 5, 5],
    ['3xRefresh', 0, 2, 10],
    ['3xRefresh', 0, 3, 10],
    ['3xRefresh', 0, 4, 10],
    ['3xRefresh', 0, 5, 10],
    ['brokenSiteReport', 0, 5, 1],
    ['brokenSiteReport', 0, 5, 2],
    ['brokenSiteReport', 0, 5, 3],
    ['toggleSiteReport', 0, 5, 1],
    ['toggleSiteReport', 0, 5, 2],
    ['toggleSiteReport', 0, 5, 3],
    ['breakageFormOpen', 0, 5, 1],
    ['breakageFormOpen', 0, 5, 2],
    ['breakageFormOpen', 0, 5, 3],
    ['privacyDashboardOpen', 0, 5, 1],
    ['privacyDashboardOpen', 0, 5, 5],
    ['privacyDashboardOpen', 0, 5, 10],
    ['protectionToggle', 0, 5, 1],
    ['protectionToggle', 0, 5, 5],
    ['protectionToggle', 0, 5, 10],
];

/**
 * Get default set of metrics for a breakage experiment.
 * @returns {import('./components/abn-experiments').ExperimentMetric[]}
 */
export function generateBreakageMetrics() {
    return breakageMetricSpec.map(([metric, conversionWindowStart, conversionWindowEnd, value]) => ({
        metric,
        conversionWindowStart,
        conversionWindowEnd,
        value,
    }));
}
