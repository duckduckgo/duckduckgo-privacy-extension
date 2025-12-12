import browser from 'webextension-polyfill';
import { getDisclosureDetails } from '../../shared/js/background/broken-site-report';

describe('broke-site-report', () => {
    let currentTabDetails = null;

    beforeAll(async () => {
        // Stub the necessary browser.tabs.* APIs.
        spyOn(browser.tabs, 'query').and.callFake(() => {
            const result = [];

            if (currentTabDetails) {
                result.push(currentTabDetails);
            }

            return Promise.resolve(result);
        });
    });

    beforeEach(() => {
        currentTabDetails = null;
    });

    it('getDisclosureDetails()', async () => {
        expect(await getDisclosureDetails()).toEqual({
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

        expect(await getDisclosureDetails()).toEqual({
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
});
