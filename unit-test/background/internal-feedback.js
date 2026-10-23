import { askBrowser } from '../../shared/js/background/components/internal-feedback';

const formSender = { tab: { id: 7 }, frameId: 0 };

describe('internal feedback', () => {
    afterEach(() => {
        delete chrome.ddg;
    });

    it('asks the browser about the sending tab', async () => {
        chrome.ddg = { getInternalFeedbackDeviceInfo: jasmine.createSpy().and.resolveTo({ platform: 'windows' }) };

        expect(await askBrowser('getInternalFeedbackDeviceInfo', formSender, undefined)).toEqual({ platform: 'windows' });
        expect(chrome.ddg.getInternalFeedbackDeviceInfo).toHaveBeenCalledWith(7);
    });

    it('does not ask for a subframe or a sender without a tab', async () => {
        chrome.ddg = { getInternalFeedbackAttachments: jasmine.createSpy() };

        expect(await askBrowser('getInternalFeedbackAttachments', { tab: { id: 7 }, frameId: 3 }, {})).toEqual({});
        expect(await askBrowser('getInternalFeedbackAttachments', { frameId: 0 }, {})).toEqual({});
        expect(chrome.ddg.getInternalFeedbackAttachments).not.toHaveBeenCalled();
    });

    it('falls back when the browser refuses', async () => {
        chrome.ddg = { getInternalFeedbackAttachments: jasmine.createSpy().and.rejectWith(new Error('not the form')) };
        spyOn(console, 'warn');

        expect(await askBrowser('getInternalFeedbackAttachments', formSender, {})).toEqual({});
    });

    it('falls back when the browser lacks the method', async () => {
        chrome.ddg = {};
        expect(await askBrowser('getInternalFeedbackDeviceInfo', formSender, undefined)).toBeUndefined();

        delete chrome.ddg;
        expect(await askBrowser('getInternalFeedbackAttachments', formSender, {})).toEqual({});
    });
});
