/**
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').ToggleReportScreen} ToggleReportOptions
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').DataItemId} ToggleReportParamId
 */

import browser from 'webextension-polyfill';
import { registerMessageHandler } from '../message-handlers';
import { postPopupMessage } from '../popupMessaging';
import settings from '../settings';
import { getCurrentTab, getFeatureSettings, getURLWithoutQueryString, reloadCurrentTab, resolveAfterDelay } from '../utils';
import { sendBreakageReportForCurrentTab } from '../broken-site-report';
import { createAlarm } from '../wrapper';
import tabManager from '../tab-manager';

/**
 * This component is for the "toggle reports" (aka the "simplified breakage
 * report" UI flow. When the user clicks to disable protections for a website,
 * it prompts the user to optionally submit a breakage report to us afterwards.
 * There is some additional logic to ensure that users are not prompted to
 * submit reports too often, to hopefully avoid annoying them.
 *
 * TODO: Once ToggleReports.shouldDisplay() is called from another component,
 *       make shouldDisplay() (and the dependant methods) instance methods.
 *       Also, then pass the tabManager and settings modules into the
 *       ToggleReports constructor via dependency injection, instead of
 *       importing them, to aid unit testing.
 */
export default class ToggleReports {
    static ALARM_NAME = 'toggleReportsClearExpired';

    /**
     * When prompting the user to submit a breakage report, context is shown to
     * explain what will be included in the report. This is to help the user
     * make an informed decision. That context is based on this list of
     * parameter IDs. The naming system is similar, but not quite the same as
     * the breakage report parameter names themselves. See the docs[1] for a
     * list of all the possible values. Take care to update this list as the
     * privacy-dashboard dependency is updated, and when breakage parameters are
     * added/removed (see '../broken-site-report.js').
     *
     * Note: The UI displays the parameters in the order the IDs are listed
     *       here, so consider the ordering when adjusting the array.
     *
     * TODO: In the future, it would be better for the UI to accept all of the
     *       actual parameter names instead. Needing to update the list here
     *       manually seems error-prone. Likewise with the ordering, it would be
     *       better for the UI to decide the display order for the parameters,
     *       to ensure they are displayed consistently between platforms.
     *
     * 1 - https://duckduckgo.github.io/privacy-dashboard/modules/Toggle_Report.html
     *
     * @type {ToggleReportParamId[]}
     */
    static PARAM_IDS = [
        'siteUrl',
        'atb',
        'errorDescriptions',
        'extensionVersion',
        'features',
        'httpErrorCodes',
        'jsPerformance',
        'locale',
        'openerContext',
        'requests',
        'userRefreshCount',
    ];

    constructor() {
        this.onDisconnect = this.toggleReportFinished.bind(this, false);

        registerMessageHandler('getToggleReportOptions', (_, sender) => this.toggleReportStarted(sender));

        registerMessageHandler('rejectToggleReport', (_, sender) => this.toggleReportFinished(false, sender));

        registerMessageHandler('sendToggleReport', (_, sender) => this.toggleReportFinished(true, sender));

        registerMessageHandler('seeWhatIsSent', () => {});

        createAlarm(ToggleReports.ALARM_NAME, { periodInMinutes: 60 });
        browser.alarms.onAlarm.addListener(async ({ name }) => {
            if (name === ToggleReports.ALARM_NAME) {
                await ToggleReports.clearExpiredResponses();
            }
        });
    }

    /**
     * Provides details of what will be included in a breakage report, so that
     * the user can make an informed decision. Called when the "toggle reports"
     * UI flow begins.
     *
     * @param {browser.Runtime.Port} sender
     * @returns {Promise<ToggleReportOptions>}
     */
    async toggleReportStarted(sender) {
        // If the browser closes the popup UI during the "toggle reports" flow
        // (e.g. because the user clicked away), the connection will drop and
        // this event will fire.
        sender?.onDisconnect?.addListener(this.onDisconnect);

        let siteUrl = null;
        const currentTabUrl = (await getCurrentTab())?.url;
        if (currentTabUrl) {
            siteUrl = getURLWithoutQueryString(currentTabUrl);
        }

        /** @type {ToggleReportOptions} */
        const response = { data: [] };

        for (const paramId of ToggleReports.PARAM_IDS) {
            if (paramId === 'siteUrl' && siteUrl) {
                response.data.push({ id: 'siteUrl', additional: { url: siteUrl } });
            } else {
                response.data.push({ id: paramId });
            }
        }

        return response;
    }

    /**
     * Called when the "toggle reports" UI flow finishes. If the user chose to
     * send the breakage report that will be sent now.
     *
     * @param {boolean} accepted
     *   True if the user opted to send the breakage report, false otherwise.
     * @param {browser.Runtime.Port?} sender
     * @returns {Promise<void>}
     */
    async toggleReportFinished(accepted, sender) {
        sender?.onDisconnect?.removeListener(this.onDisconnect);

        // Note the response and time.
        await settings.ready();
        const times = settings.getSetting('toggleReportTimes') || [];
        times.push({ timestamp: Date.now(), accepted });
        settings.updateSetting('toggleReportTimes', times);

        if (accepted) {
            try {
                // Send the breakage report before reloading the page, to ensure
                // the correct page details are sent with the report.
                await sendBreakageReportForCurrentTab({
                    pixelName: 'protection-toggled-off-breakage-report',
                    reportFlow: 'on_protections_off_dashboard_main',
                });
            } catch (e) {
                // Catch this, mostly to ensure the page is still reloaded if
                // sending the breakage report fails.
                console.error('Failed to send breakage report', e);
            }
        }

        // Reload the page. If the user opted to send the breakage report, also
        // wait five seconds before closing the popup to give them a chance to
        // read the thank you message.
        await Promise.all([reloadCurrentTab(), resolveAfterDelay(accepted ? 5000 : 0)]);

        postPopupMessage({ messageType: 'closePopup' });
    }

    /**
     * Clear any old recorded response times.
     *
     * @returns {Promise<void>}
     */
    static async clearExpiredResponses() {
        const { dismissInterval, promptInterval } = getFeatureSettings('toggleReports');

        const now = Date.now();
        let dismissCutoff = null;
        let acceptCutoff = null;

        if (typeof dismissInterval === 'number') {
            dismissCutoff = now - dismissInterval * 1000;
        }
        if (typeof promptInterval === 'number') {
            acceptCutoff = now - promptInterval * 1000;
        }

        await settings.ready();
        let times = settings.getSetting('toggleReportTimes') || [];
        const existingTimesLength = times.length;
        times = times.filter(
            ({ accepted, timestamp }) =>
                (accepted && (typeof acceptCutoff !== 'number' || timestamp >= acceptCutoff)) ||
                (!accepted && (typeof dismissCutoff !== 'number' || timestamp >= dismissCutoff)),
        );

        if (times.length < existingTimesLength) {
            settings.updateSetting('toggleReportTimes', times);
        }
    }

    /**
     * Count the number of accepted and declined responses recorded.
     *
     * Note: Does not filter away expired times, take care to call
     *       ToggleReports.clearExpiredResponses() first.
     *
     * @returns {Promise<{accepted: number, declined: number}>}
     */
    static async countResponses() {
        await settings.ready();
        const times = settings.getSetting('toggleReportTimes') || [];

        const counts = { accepted: 0, declined: 0 };
        for (const { accepted } of times) {
            counts[accepted ? 'accepted' : 'declined']++;
        }

        return counts;
    }

    /**
     * Check if the toggle report UI flow should been displayed display for the
     * currently focused tab.
     *
     * @returns {Promise<boolean>}
     */
    static async shouldDisplay() {
        const currentTab = await tabManager.getOrRestoreCurrentTab();

        // Feature must be enabled for the tab.
        if (!currentTab?.site?.isFeatureEnabled('toggleReports')) {
            return false;
        }

        const { dismissLogicEnabled, promptLimitLogicEnabled, maxPromptCount } = getFeatureSettings('toggleReports');

        await ToggleReports.clearExpiredResponses();
        const counts = await ToggleReports.countResponses();

        // Dismissed report count must not exceed the limit.
        if (dismissLogicEnabled && counts.declined > 0) {
            return false;
        }

        // Accepted report count must not exceed the limit.
        if (promptLimitLogicEnabled && typeof maxPromptCount === 'number' && counts.accepted >= maxPromptCount) {
            return false;
        }

        return true;
    }
}
