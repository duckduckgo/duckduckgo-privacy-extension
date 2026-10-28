import { askBrowser, isInternalFeedbackEnabled } from '../../shared/js/background/components/internal-feedback';

const FORM_HOST = 'internalapps.duckduckgo.com';
const formSender = { tab: { id: 7 }, frameId: 0, url: `https://${FORM_HOST}/internal-feedback/` };

/**
 * @param {{ bridgeEnabled?: boolean, formDomain?: string | string[] }} [options]
 */
function remoteConfigWith({ bridgeEnabled = true, formDomain = FORM_HOST } = {}) {
    return {
        ready: Promise.resolve(),
        isFeatureEnabled: (name) => name === 'messageBridge' && bridgeEnabled,
        getFeatureSettings: () => ({
            internalFeedback: 'disabled',
            domains: [{ domain: formDomain, patchSettings: [{ op: 'replace', path: '/internalFeedback', value: 'enabled' }] }],
        }),
    };
}

describe('internal feedback', () => {
    let previousComponents;

    beforeEach(() => {
        previousComponents = globalThis.components;
        globalThis.components = { remoteConfig: remoteConfigWith() };
    });

    afterEach(() => {
        globalThis.components = previousComponents;
        delete chrome.ddg;
    });

    it('asks the browser about the sending tab', async () => {
        chrome.ddg = { getInternalFeedbackDeviceInfo: jasmine.createSpy().and.resolveTo({ platform: 'windows' }) };

        expect(await askBrowser('getInternalFeedbackDeviceInfo', formSender, undefined)).toEqual({ platform: 'windows' });
        expect(chrome.ddg.getInternalFeedbackDeviceInfo).toHaveBeenCalledWith(7);
    });

    it('does not ask for a subframe or a sender without a tab', async () => {
        chrome.ddg = { getInternalFeedbackAttachments: jasmine.createSpy() };

        expect(await askBrowser('getInternalFeedbackAttachments', { ...formSender, frameId: 3 }, {})).toEqual({});
        expect(await askBrowser('getInternalFeedbackAttachments', { frameId: 0, url: formSender.url }, {})).toEqual({});
        expect(chrome.ddg.getInternalFeedbackAttachments).not.toHaveBeenCalled();
    });

    it('does not ask when the remote config disables the form', async () => {
        chrome.ddg = { getInternalFeedbackAttachments: jasmine.createSpy() };

        globalThis.components = { remoteConfig: remoteConfigWith({ bridgeEnabled: false }) };
        expect(await askBrowser('getInternalFeedbackAttachments', formSender, {})).toEqual({});

        globalThis.components = { remoteConfig: remoteConfigWith({ formDomain: 'example.com' }) };
        expect(await askBrowser('getInternalFeedbackAttachments', formSender, {})).toEqual({});

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

describe('isInternalFeedbackEnabled', () => {
    it('applies the domain patches to the form host and its subdomains', () => {
        expect(isInternalFeedbackEnabled(remoteConfigWith(), FORM_HOST)).toBeTrue();
        expect(isInternalFeedbackEnabled(remoteConfigWith({ formDomain: ['duckduckgo.com'] }), FORM_HOST)).toBeTrue();
        expect(isInternalFeedbackEnabled(remoteConfigWith(), 'duckduckgo.com')).toBeFalse();
        expect(isInternalFeedbackEnabled(undefined, FORM_HOST)).toBeFalse();
    });
});
