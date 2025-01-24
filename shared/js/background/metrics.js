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
        sendToggleReport: 'toggleSiteReport'
    }

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
                    abnMetrics.onMetricTriggered(this.messageToMetricMap[ev.messageType])
                }
            }
        })
    }
}


export class RefreshMetric {

    /** @type {Map<number, number[]>} */
    tabRefreshCounter = new Map()
    DEBOUNCE_MS = 500

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
                const { tabId } = ev.detail
                if (!this.tabRefreshCounter.has(tabId)) {
                    this.tabRefreshCounter.set(tabId, [])
                }
                const refreshCounter = this.tabRefreshCounter.get(tabId) || []
                if (refreshCounter.length > 0 && refreshCounter[refreshCounter.length - 1] > Date.now() - this.DEBOUNCE_MS) {
                    // last refresh less than DEBOUNCE_MS ago, ignore
                    return
                }
                refreshCounter.push(Date.now())

                // reload-twice-within-12-seconds
                const tMinus12s = Date.now() - 12000
                if (refreshCounter.filter(t => t > tMinus12s).length === 2) {
                    abnMetrics.onMetricTriggered('reload-twice-within-12-seconds')
                }
                // reload-three-times-within-20-seconds
                const tMinus20s = Date.now() - 20000
                if (refreshCounter.filter(t => tMinus20s).length === 3) {
                    abnMetrics.onMetricTriggered('reload-three-times-within-20-seconds')
                }

                // clean up old refreshes
                while (refreshCounter.length > 0 && refreshCounter[0] < tMinus20s) {
                    refreshCounter.pop()
                }
                if (refreshCounter.length === 0) {
                    this.tabRefreshCounter.delete(tabId)
                }
            }
        })
    }
}
