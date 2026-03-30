import CookiePromptManagement from '../../shared/js/background/components/cookie-prompt-management';
import messageHandlers from '../../shared/js/background/message-registry';
import { sessionStorageFallback } from '../../shared/js/background/wrapper';

/**
 * Create a mock CPMMessagingBase with spies.
 */
function createMockMessaging({ autoconsentEnabledForSite = true, autoconsentSettingEnabled = true, subfeatureEnabled = false } = {}) {
    return {
        logMessage: jasmine.createSpy('logMessage').and.returnValue(Promise.resolve()),
        refreshDashboardState: jasmine.createSpy('refreshDashboardState').and.returnValue(Promise.resolve()),
        showCpmAnimation: jasmine.createSpy('showCpmAnimation').and.returnValue(Promise.resolve()),
        notifyPopupHandled: jasmine.createSpy('notifyPopupHandled').and.returnValue(Promise.resolve()),
        checkAutoconsentSettingEnabled: jasmine.createSpy('checkAutoconsentSettingEnabled').and.returnValue(Promise.resolve(autoconsentSettingEnabled)),
        checkAutoconsentEnabledForSite: jasmine.createSpy('checkAutoconsentEnabledForSite').and.returnValue(Promise.resolve(autoconsentEnabledForSite)),
        checkSubfeatureEnabled: jasmine.createSpy('checkSubfeatureEnabled').and.returnValue(Promise.resolve(subfeatureEnabled)),
        sendPixel: jasmine.createSpy('sendPixel').and.returnValue(Promise.resolve()),
        refreshRemoteConfig: jasmine.createSpy('refreshRemoteConfig').and.returnValue(
            Promise.resolve({
                version: 1,
                features: {
                    autoconsent: {
                        state: 'enabled',
                        exceptions: [],
                        settings: {
                            disabledCMPs: [],
                        },
                    },
                },
            }),
        ),
    };
}

function makeSender({ tabId = 1, frameId = 0, tabUrl = 'https://example.com/page', frameUrl = undefined } = {}) {
    return {
        tab: {
            id: tabId,
            url: tabUrl,
        },
        frameId,
        url: frameUrl || tabUrl,
    };
}

function makeInitMessage() {
    return {
        type: 'init',
        url: 'https://example.com/page',
    };
}

describe('CookiePromptManagement', () => {
    beforeEach(() => {
        Object.keys(messageHandlers).forEach((k) => delete messageHandlers[k]);
        sessionStorageFallback.clear();
    });

    describe('disabled-for-site pixel', () => {
        it('fires disabled-for-site pixel for main frame when autoconsent is disabled for site', async () => {
            const mockMessaging = createMockMessaging({ autoconsentEnabledForSite: false });
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;
            const sender = makeSender({ frameId: 0 });
            await handler({}, sender, { autoconsentPayload: makeInitMessage() });

            const pixelCalls = mockMessaging.sendPixel.calls.allArgs();
            const disabledPixelCalls = pixelCalls.filter(([name]) => name === 'autoconsent_disabled-for-site');
            expect(disabledPixelCalls.length).toBe(1);
        });

        it('does NOT fire disabled-for-site pixel for subframes when autoconsent is disabled for site', async () => {
            const mockMessaging = createMockMessaging({ autoconsentEnabledForSite: false });
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;

            const subframeIds = [1, 2, 3, 4, 5];
            for (const frameId of subframeIds) {
                const sender = makeSender({ frameId });
                await handler({}, sender, { autoconsentPayload: makeInitMessage() });
            }

            const pixelCalls = mockMessaging.sendPixel.calls.allArgs();
            const disabledPixelCalls = pixelCalls.filter(([name]) => name === 'autoconsent_disabled-for-site');
            expect(disabledPixelCalls.length).toBe(0);
        });

        it('fires disabled-for-site pixel exactly once when main frame + multiple subframes all send init', async () => {
            const mockMessaging = createMockMessaging({ autoconsentEnabledForSite: false });
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;

            // main frame
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            // subframes
            for (const frameId of [1, 2, 3, 10, 20]) {
                await handler({}, makeSender({ frameId }), { autoconsentPayload: makeInitMessage() });
            }

            const pixelCalls = mockMessaging.sendPixel.calls.allArgs();
            const disabledPixelCalls = pixelCalls.filter(([name]) => name === 'autoconsent_disabled-for-site');
            expect(disabledPixelCalls.length).toBe(1);
        });

        it('counts disabled-for-site only once in summaryEvents when main frame + subframes send init', async () => {
            const mockMessaging = createMockMessaging({ autoconsentEnabledForSite: false });
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;

            // main frame + 5 subframes
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            for (const frameId of [1, 2, 3, 4, 5]) {
                await handler({}, makeSender({ frameId }), { autoconsentPayload: makeInitMessage() });
            }

            const state = await cpm.getCpmState();
            expect(state.summaryEvents['disabled-for-site']).toBe(1);
        });
    });

    describe('init pixel', () => {
        it('fires init pixel only for main frame when autoconsent is enabled', async () => {
            const mockMessaging = createMockMessaging({ autoconsentEnabledForSite: true });
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;

            // main frame + subframes
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            for (const frameId of [1, 2, 3]) {
                await handler({}, makeSender({ frameId }), { autoconsentPayload: makeInitMessage() });
            }

            const pixelCalls = mockMessaging.sendPixel.calls.allArgs();
            const initPixelCalls = pixelCalls.filter(([name]) => name === 'autoconsent_init');
            expect(initPixelCalls.length).toBe(1);
        });
    });
});
