import { updateActionIcon } from '../../../shared/js/background/events/privacy-icon-indicator';
import { iconPaths } from '../../../shared/data/constants';
import Site from '../../../shared/js/background/classes/site';
import browser from 'webextension-polyfill';

describe('privacy icon indicator', () => {
    beforeEach(() => {
        spyOn(browser.browserAction, 'setIcon').and.returnValue(Promise.resolve());
    });
    it('uses special state when a site is allowlisted', async () => {
        // construct an instance of Site where a user has allowlisted it
        const site = new Site('https://example.com');
        spyOnProperty(site, 'allowlisted').and.returnValue(true);

        // perform the update, as would occur through the onCompleted event
        const tabId = 100;
        await updateActionIcon(site, tabId);

        // ensure the browser api is called with the correct args.
        expect(browser.browserAction.setIcon.calls.argsFor(0)).toEqual([
            {
                path: iconPaths.withSpecialState,
                tabId: 100,
            },
        ]);
    });
    it('uses special state when a site is remote-disabled', async () => {
        // construct an instance of Site where the `contentBlocking` feature was disabled
        const site = new Site('https://example.com');
        spyOn(site, 'isFeatureEnabled').and.returnValue(false);

        // perform the update, as would occur through the onCompleted event
        const tabId = 100;
        await updateActionIcon(site, tabId);

        // ensure the browser api is called with the correct args.
        expect(browser.browserAction.setIcon.calls.argsFor(0)).toEqual([
            {
                path: iconPaths.withSpecialState,
                tabId: 100,
            },
        ]);
    });
});
