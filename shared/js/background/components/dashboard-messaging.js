import { breakageReportForTab, getDisclosureDetails } from '../broken-site-report';
import { dashboardDataFromTab } from '../classes/privacy-dashboard-data';
import { registerMessageHandler } from '../message-handlers';
import { getCurrentTab, sendTabMessage } from '../utils';
import { isFireButtonEnabled } from './fire-button';

/**
 * Message handlers for communication from the dashboard to the extension background.
 *
 * Note, handlers are split over multiple components, and some are not yet encapsulated in a component.
 *
 * Implemented in this component:
 *  - getBreakageFormOptions
 *  - getPrivacyDashboardData
 *  - submitBrokenSiteReport
 *
 * FireButton component:
 *  - doBurn
 *  - getBurnOptions
 *  - setBurnDefaultOption
 *
 * EmailAutofill component:
 *  - refreshAlias
 *
 * ToggleReports component:
 *  - getToggleReportOptions
 *  - rejectToggleReport
 *  - sendToggleReport
 *  - seeWhatIsSent
 *
 * Static message handlers:
 *  - openOptions
 *  - search
 *  - setLists
 *
 * See https://duckduckgo.github.io/privacy-dashboard/modules/Browser_Extensions_integration.html
 */
export default class DashboardMessaging {
    /**
     * @param {{
     *  settings: import('../settings.js');
     *  tds: import('./tds').default;
     *  tabManager: import('../tab-manager.js');
     * }} args
     */
    constructor({ settings, tds, tabManager }) {
        this.settings = settings;
        this.tds = tds;
        this.tabManager = tabManager;

        registerMessageHandler('submitBrokenSiteReport', (report) => this.submitBrokenSiteReport(report));
        registerMessageHandler('getPrivacyDashboardData', this.getPrivacyDashboardData.bind(this));
        registerMessageHandler('getBreakageFormOptions', getDisclosureDetails);
    }

    /**
     * Only the dashboard sends this message, so we import the types from there.
     * @param {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').BreakageReportRequest} breakageReport
     * @param {string} [pixelName]
     * @param {string} [reportFlow]
     * @returns {Promise<void>}
     */
    async submitBrokenSiteReport(breakageReport, pixelName = 'epbf', reportFlow = undefined) {
        // wait for config and TDS so we can get etags and config version
        await Promise.all([this.tds.remoteConfig.allLoadingFinished, this.tds.tds.ready]);
        const { category, description } = breakageReport;
        const tab = await this.tabManager.getOrRestoreCurrentTab();
        if (!tab) {
            return;
        }

        // Get breakage data from content-scope-scripts
        let pageParams = {};
        try {
            // Send request to content-scope-scripts (main frame only to avoid duplicate iframe responses).
            // The response comes back asynchronously via breakageReportResult message handler,
            // so we wait to give it time to arrive and be stored in tab.breakageReportData.
            await sendTabMessage(tab.id, { messageType: 'getBreakageReportValues' }, { frameId: 0 });

            // Build pageParams from content-scope-scripts data
            if (tab.breakageReportData) {
                pageParams = {
                    jsPerformance: tab.breakageReportData.jsPerformance,
                    docReferrer: tab.breakageReportData.referrer,
                    opener: tab.breakageReportData.opener,
                    detectorData: tab.breakageReportData.detectorData,
                };
            }
        } catch (e) {
            // Content-scope-scripts not available (e.g., on restricted pages)
            console.warn('Failed to get breakage report data:', e);
        }

        const tds = this.tds.tds.etag;
        const remoteConfigEtag = this.tds.remoteConfig.etag;
        const remoteConfigVersion = this.tds.remoteConfig.config?.version || '';
        return breakageReportForTab({
            pixelName,
            tab,
            tds,
            remoteConfigEtag,
            remoteConfigVersion,
            category,
            description,
            pageParams,
            reportFlow,
        });
    }

    /**
     * This message is here to ensure the privacy dashboard can render
     * from a single call to the extension.
     *
     * Currently, it will collect data for the current tab and email protection
     * user data.
     */
    async getPrivacyDashboardData(options) {
        let { tabId } = options;
        if (tabId === null) {
            const currentTab = await getCurrentTab();
            if (!currentTab?.id) {
                throw new Error('could not get the current tab...');
            }
            tabId = currentTab?.id;
        }

        // Await for storage to be ready; this happens on service worker closing mostly.
        await this.settings.ready();
        await this.tds.config.ready;

        const tab = await this.tabManager.getOrRestoreTab(tabId);
        if (!tab) throw new Error('unreachable - cannot access current tab with ID ' + tabId);
        const userData = this.settings.getSetting('userData');
        const fireButtonData = {
            enabled: isFireButtonEnabled,
        };
        return dashboardDataFromTab(tab, userData, fireButtonData);
    }
}
