import browser from 'webextension-polyfill';
import MessageRouter from '../../shared/js/background/components/message-router';
import { registerMessageHandler } from '../../shared/js/background/message-registry';

describe('MessageRouter', () => {
    it('does not let a legacy getAddresses key override an explicit messageType', async () => {
        // Capture the listener MessageRouter registers for content script messages.
        let onMessage;
        spyOn(browser.runtime.onMessage, 'addListener').and.callFake((listener) => {
            onMessage = listener;
        });
        // eslint-disable-next-line no-new
        new MessageRouter();

        const openShareFeedbackPage = jasmine.createSpy('openShareFeedbackPage');
        const getAddresses = jasmine.createSpy('getAddresses');
        registerMessageHandler('openShareFeedbackPage', openShareFeedbackPage);
        registerMessageHandler('getAddresses', getAddresses);

        // An allowed messageType, with a legacy getAddresses key added.
        const sender = { id: browser.runtime.id, tab: { id: 1 } };
        await onMessage({ messageType: 'openShareFeedbackPage', getAddresses: {} }, sender);

        expect(getAddresses).not.toHaveBeenCalled();
        expect(openShareFeedbackPage).toHaveBeenCalledTimes(1);
    });
});
