import browser from 'webextension-polyfill';
import settings from '../../shared/js/background/settings';
import ToggleReports from '../../shared/js/background/components/toggle-reports';
import tabManager from '../../shared/js/background/tab-manager';
import tdsStorageStub from '../helpers/tds';

describe('ToggleReports', () => {
    let currentTabDetails = null;
    let currentTimestamp = 1;
    let settingsStorage = null;
    /** @type {ToggleReports} */
    let toggleReports = null;
    /** @type {jasmine.Spy} */
    let submittedReports;
    let toggleReportsConfig = null;

    // Dummy timestamps.
    const oneDay = 86400000;
    const today = 1727101418823;
    const tomorrow = today + oneDay;
    const twoDaysTime = today + oneDay * 2;
    const threeDaysTime = today + oneDay * 3;
    const fourDaysTime = today + oneDay * 4;
    const fiveDaysTime = today + oneDay * 5;
    const sixDaysTime = today + oneDay * 6;

    beforeAll(async () => {
        // Ensure the test configuration is being used, and keep a reference to
        // the toggleReports feature configuration.
        const { tdsData } = tdsStorageStub.stub();
        toggleReportsConfig = tdsData.config.features.toggleReports;

        // Stub settings.
        settingsStorage = new Map();
        spyOn(settings, 'ready').and.returnValue(Promise.resolve());
        spyOn(settings, 'getSetting').and.callFake((name) => settingsStorage.get(name));
        spyOn(settings, 'updateSetting').and.callFake((name, value) => {
            settingsStorage.set(name, value);
        });

        // Stub the necessary browser.tabs.* APIs.
        spyOn(browser.tabs, 'query').and.callFake(() => {
            const result = [];

            if (currentTabDetails) {
                result.push(currentTabDetails);
            }

            return Promise.resolve(result);
        });
        spyOn(browser.tabs, 'reload').and.returnValue(Promise.resolve());
        spyOn(browser.tabs, 'sendMessage').and.callFake((tabId, message) => {
            if (message.getBreakagePageParams) {
                return Promise.resolve({});
            }
        });

        // Stub the window.setTimeout and Date.now() APIs.
        spyOn(window, 'setTimeout').and.callFake((callback) => {
            callback();
        });
        spyOn(Date, 'now').and.callFake(() => currentTimestamp);
    });

    beforeEach(() => {
        currentTabDetails = null;
        currentTimestamp = 1;
        settingsStorage.clear();

        toggleReports = new ToggleReports({
            dashboardMessaging: {
                submitBrokenSiteReport: () => {},
            },
        });
        submittedReports = spyOn(toggleReports.dashboardMessaging, 'submitBrokenSiteReport');
    });

    it('toggleReportStarted()', async () => {
        expect(await toggleReports.toggleReportStarted()).toEqual({
            data: [
                { id: 'siteUrl' },
                { id: 'atb' },
                { id: 'errorDescriptions' },
                { id: 'extensionVersion' },
                { id: 'features' },
                { id: 'httpErrorCodes' },
                { id: 'jsPerformance' },
                { id: 'locale' },
                { id: 'openerContext' },
                { id: 'requests' },
                { id: 'userRefreshCount' },
                { id: 'detectorData' },
            ],
        });

        currentTabDetails = { url: 'https://domain.example/path?param=value' };

        expect(await toggleReports.toggleReportStarted()).toEqual({
            data: [
                { id: 'siteUrl', additional: { url: 'https://domain.example/path' } },
                { id: 'atb' },
                { id: 'errorDescriptions' },
                { id: 'extensionVersion' },
                { id: 'features' },
                { id: 'httpErrorCodes' },
                { id: 'jsPerformance' },
                { id: 'locale' },
                { id: 'openerContext' },
                { id: 'requests' },
                { id: 'userRefreshCount' },
                { id: 'detectorData' },
            ],
        });
    });

    it('toggleReportFinished()', async () => {
        const expectReports = async (reports, accepted, declined) => {
            expect(await ToggleReports.countResponses()).toEqual({ accepted, declined });
            expect(submittedReports).toHaveBeenCalledTimes(reports.length);
            expect(submittedReports.calls.all().map((c) => c.args)).toEqual(reports);
        };

        // Set things up, so that breakage reports can be sent.
        currentTabDetails = {
            id: 123,
            url: 'https://domain.example/path?param=value',
        };
        tabManager.create(currentTabDetails);
        settings.updateSetting('config-etag', 'config-etag-123');
        settings.updateSetting('tds-etag', 'tds-etag-123');

        // No reports sent initially.
        await expectReports([], 0, 0);

        // No report should be sent if user declined.
        await toggleReports.toggleReportFinished(false);
        await expectReports([], 0, 1);

        // Disconnect counts as declined, report should not be sent.
        await toggleReports.toggleReportStarted({
            onDisconnect: {
                addListener(callback) {
                    callback();
                },
            },
        });
        await expectReports([], 0, 2);

        // If user accepts, report should be sent.
        await toggleReports.toggleReportFinished(true);
        await expectReports([[{}, 'protection-toggled-off-breakage-report', 'on_protections_off_dashboard_main']], 1, 2);

        // Tidy up.
        tabManager.delete(currentTabDetails.id);
    });

    it('clearExpiredResponses()', async () => {
        const expectResponseTimes = (expectedTimes) => {
            expect(settings.getSetting('toggleReportTimes') || []).toEqual(expectedTimes);
        };

        // Nothing there initially.
        expectResponseTimes([]);

        // Clearing doesn't do anything when there's no responses.
        currentTimestamp = today + 1;
        await ToggleReports.clearExpiredResponses();
        expectResponseTimes([]);

        // Several responses came in.
        settings.updateSetting('toggleReportTimes', [
            { timestamp: today, accepted: true },
            { timestamp: today, accepted: false },
            { timestamp: tomorrow, accepted: true },
            { timestamp: tomorrow, accepted: false },
            { timestamp: twoDaysTime, accepted: true },
            { timestamp: twoDaysTime, accepted: false },
            { timestamp: threeDaysTime, accepted: true },
            { timestamp: threeDaysTime, accepted: false },
            { timestamp: fourDaysTime, accepted: true },
            { timestamp: fourDaysTime, accepted: false },
        ]);

        // Responses older than the cut-off are removed.
        currentTimestamp = fourDaysTime + 1;
        await ToggleReports.clearExpiredResponses();
        expectResponseTimes([
            { timestamp: threeDaysTime, accepted: true },
            { timestamp: fourDaysTime, accepted: true },
            { timestamp: fourDaysTime, accepted: false },
        ]);

        // After some time passed, more responses should be removed.
        currentTimestamp = fiveDaysTime + 1;
        await ToggleReports.clearExpiredResponses();
        expectResponseTimes([{ timestamp: fourDaysTime, accepted: true }]);

        // Eventually all responses should be removed.
        currentTimestamp = sixDaysTime + 1;
        await ToggleReports.clearExpiredResponses();
        expectResponseTimes([]);
    });

    it('countResponses()', async () => {
        const expectResponses = async (accepted, declined) => {
            expect(await ToggleReports.countResponses()).toEqual({ accepted, declined });
        };

        // No responses recorded initially.
        await expectResponses(0, 0);

        // One declined response recorded.
        await toggleReports.toggleReportFinished(false);
        await expectResponses(0, 1);

        // One accepted response recorded as well.
        await toggleReports.toggleReportFinished(true);
        await expectResponses(1, 1);

        // One last accepted response.
        await toggleReports.toggleReportFinished(true);
        await expectResponses(2, 1);

        // Responses cleared.
        settings.updateSetting('toggleReportTimes', []);
        await expectResponses(0, 0);
    });

    it('shouldDisplay', async () => {
        // Set up the current tab.
        currentTabDetails = {
            id: 123,
            url: 'https://domain.example/path?param=value',
        };
        tabManager.create(currentTabDetails);

        // Feature enabled + no responses.
        expect(await ToggleReports.shouldDisplay()).toEqual(true);

        // Feature disabled.
        toggleReportsConfig.state = 'disabled';
        expect(await ToggleReports.shouldDisplay()).toEqual(false);

        // Feature enabled + no responses.
        toggleReportsConfig.state = 'enabled';
        expect(await ToggleReports.shouldDisplay()).toEqual(true);

        // Feature disabled for the tab.
        const allowedUrl = currentTabDetails.url;
        currentTabDetails.url = 'https://no-toggle-reports.example/path';
        tabManager.create(currentTabDetails);
        expect(await ToggleReports.shouldDisplay()).toEqual(false);

        // Feature enabled + two accepted responses.
        currentTabDetails.url = allowedUrl;
        tabManager.create(currentTabDetails);
        currentTimestamp = today;
        settings.updateSetting('toggleReportTimes', [
            { timestamp: today, accepted: true },
            { timestamp: today, accepted: true },
        ]);
        expect(await ToggleReports.shouldDisplay()).toEqual(true);

        // Feature enabled + three accepted responses.
        settings.updateSetting('toggleReportTimes', [
            { timestamp: today, accepted: true },
            { timestamp: today, accepted: true },
            { timestamp: today, accepted: true },
        ]);
        expect(await ToggleReports.shouldDisplay()).toEqual(false);

        // Feature enabled + three accepted responses, but
        // promptLimitLogicEnabled disabled.
        toggleReportsConfig.settings.promptLimitLogicEnabled = false;
        expect(await ToggleReports.shouldDisplay()).toEqual(true);

        // Feature enabled + one declined response.
        toggleReportsConfig.settings.promptLimitLogicEnabled = true;
        settings.updateSetting('toggleReportTimes', [{ timestamp: today, accepted: false }]);
        expect(await ToggleReports.shouldDisplay()).toEqual(false);

        // Feature enabled + one declined response, but dismissLogicEnabled
        // disabled.
        toggleReportsConfig.settings.dismissLogicEnabled = false;
        expect(await ToggleReports.shouldDisplay()).toEqual(true);

        // Feature enabled + no responses.
        toggleReportsConfig.settings.dismissLogicEnabled = true;
        settings.updateSetting('toggleReportTimes', []);
        expect(await ToggleReports.shouldDisplay()).toEqual(true);

        // Tidy up.
        tabManager.delete(currentTabDetails.id);
    });
});
