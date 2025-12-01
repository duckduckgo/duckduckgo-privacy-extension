import browser from 'webextension-polyfill';
import load from '../../shared/js/background/load';
import tabManager from '../../shared/js/background/tab-manager';
import DashboardMessaging from '../../shared/js/background/components/dashboard-messaging';
import { MockSettings, mockTdsStorage } from '../helpers/mocks';
import { _formatPixelRequestForTesting } from '../../shared/js/shared-utils/pixels';

const defaultBrokenSitePixelParams = {
    upgradedHttps: 'false',
    urlParametersRemoved: 'false',
    ctlYouTube: 'false',
    ctlFacebookPlaceholderShown: 'false',
    ctlFacebookLogin: 'false',
    performanceWarning: 'false',
    userRefreshCount: '0',
    jsPerformance: 'undefined',
    locale: 'en-US',
    errorDescriptions: '[]',
    openerContext: 'external',
    extensionVersion: '1234.56',
    ignoreRequests: '',
    blockedTrackers: '',
    surrogates: '',
    noActionRequests: '',
    adAttributionRequests: '',
    ignoredByUserRequests: '',
};

describe('DashboardMessaging component', () => {
    describe('submitBrokenSiteReport', () => {
        let currentTabDetails = null;
        const actualSentReports = [];
        /** @type {DashboardMessaging} */
        let dashboardMessaging = null;
        /** @type {import('../../shared/js/background/components/tds').default} */
        let tds = null;

        beforeEach(() => {
            currentTabDetails = null;
            actualSentReports.length = 0;
            spyOn(browser.tabs, 'sendMessage').and.callFake((tabId, message) => {
                if (message.getBreakagePageParams) {
                    return Promise.resolve({});
                }
                if (message.messageType === 'getBreakageReportValues') {
                    // Simulate content-scope-scripts not responding (extension handles gracefully)
                    return Promise.resolve(undefined);
                }
            });
            spyOn(load, 'url').and.callFake((url) => {
                const pixel = _formatPixelRequestForTesting(url);
                if (pixel?.name?.startsWith('epbf') || pixel?.name?.startsWith('protection-toggled-off-breakage-report')) {
                    actualSentReports.push(pixel);
                }
            });
            spyOn(browser.tabs, 'query').and.callFake(() => {
                const result = [];

                if (currentTabDetails) {
                    result.push(currentTabDetails);
                }

                return Promise.resolve(result);
            });
            const settings = new MockSettings();
            tds = mockTdsStorage(settings);
            dashboardMessaging = new DashboardMessaging({
                settings,
                tds,
                tabManager,
            });
        });

        it('sends a broken site report pixel with provide category and description', async () => {
            currentTabDetails = {
                id: 123,
                url: 'https://domain.example/path?param=value',
            };
            tabManager.create(currentTabDetails);
            await dashboardMessaging.submitBrokenSiteReport({ category: 'foo', description: 'ben' });
            expect(actualSentReports).toHaveSize(1);
            expect(actualSentReports[0]).toEqual({
                name: 'epbf_chrome',
                params: {
                    category: 'foo',
                    description: 'ben',
                    siteUrl: 'https://domain.example/path',
                    tds: tds.tds.etag,
                    remoteConfigEtag: tds.remoteConfig.etag,
                    remoteConfigVersion: `${tds.remoteConfig.config.version}`,
                    protectionsState: 'false',
                    ...defaultBrokenSitePixelParams,
                },
            });
        });

        it('does not send a pixel if there is no active tab', async () => {
            await dashboardMessaging.submitBrokenSiteReport({ category: 'foo', description: 'ben' });
            expect(actualSentReports).toHaveSize(0);
        });

        it('can send toggle reports', async () => {
            currentTabDetails = {
                id: 123,
                url: 'https://domain2.example/path?param=value',
            };
            tabManager.create(currentTabDetails);
            await dashboardMessaging.submitBrokenSiteReport(
                {},
                'protection-toggled-off-breakage-report',
                'on_protections_off_dashboard_main',
            );
            expect(actualSentReports).toHaveSize(1);
            expect(actualSentReports[0]).toEqual({
                name: 'protection-toggled-off-breakage-report_chrome',
                params: {
                    siteUrl: 'https://domain2.example/path',
                    tds: tds.tds.etag,
                    remoteConfigEtag: tds.remoteConfig.etag,
                    remoteConfigVersion: `${tds.remoteConfig.config.version}`,
                    reportFlow: 'on_protections_off_dashboard_main',
                    // protectionsState is removed from these reports
                    ...defaultBrokenSitePixelParams,
                },
            });
        });
    });
});
