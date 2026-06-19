import CookiePromptManagement from '../../shared/js/background/components/cookie-prompt-management';
import messageHandlers from '../../shared/js/background/message-registry';
import { sessionStorageFallback } from '../../shared/js/background/wrapper';

/**
 * Create a mock CPMMessagingBase with spies.
 */
function createMockMessaging({ autoconsentEnabledForSite = true, autoconsentSettingEnabled = true, subfeatureEnabled = false } = {}) {
    const mockMessaging = {
        logMessage: jasmine.createSpy('logMessage').and.returnValue(Promise.resolve()),
        refreshDashboardState: jasmine.createSpy('refreshDashboardState').and.returnValue(Promise.resolve()),
        showCpmAnimation: jasmine.createSpy('showCpmAnimation').and.returnValue(Promise.resolve()),
        notifyPopupHandled: jasmine.createSpy('notifyPopupHandled').and.returnValue(Promise.resolve()),
        checkAutoconsentSettingEnabled: jasmine
            .createSpy('checkAutoconsentSettingEnabled')
            .and.returnValue(Promise.resolve(autoconsentSettingEnabled)),
        checkAutoconsentEnabledForSite: jasmine
            .createSpy('checkAutoconsentEnabledForSite')
            .and.returnValue(Promise.resolve(autoconsentEnabledForSite)),
        checkSubfeatureEnabled: jasmine.createSpy('checkSubfeatureEnabled').and.returnValue(Promise.resolve(subfeatureEnabled)),
        sendPixel: jasmine.createSpy('sendPixel').and.returnValue(Promise.resolve()),
        setDiagnosticsErrorHandler: jasmine.createSpy('setDiagnosticsErrorHandler').and.callFake((handler) => {
            mockMessaging.diagnosticsErrorHandler = handler;
        }),
        diagnosticsErrorHandler: null,
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
    return mockMessaging;
}

function latestDashboardState(mockMessaging) {
    return mockMessaging.refreshDashboardState.calls.mostRecent().args[2];
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

    describe('CPM diagnostics', () => {
        it('reports config_unavailable when remote config is unavailable', async () => {
            const mockMessaging = createMockMessaging();
            mockMessaging.refreshRemoteConfig.and.returnValue(Promise.resolve(null));
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            await cpm.modifyCpmState(() => {});
            await Promise.resolve();

            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    consentManaged: false,
                    cosmetic: null,
                    optoutFailed: null,
                    selftestFailed: null,
                    consentReloadLoop: false,
                    consentRule: null,
                    consentHeuristicEnabled: null,
                    cpmStage: 'config_unavailable',
                    cpmErrors: new Set(),
                    cpmConfigVersion: 'unknown',
                }),
            );
        });

        it('reports settings_missing when autoconsent settings are absent', async () => {
            const mockMessaging = createMockMessaging();
            mockMessaging.refreshRemoteConfig.and.returnValue(
                Promise.resolve({
                    version: 7,
                    features: {
                        autoconsent: {
                            state: 'enabled',
                            exceptions: [],
                        },
                    },
                }),
            );
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            await cpm.modifyCpmState(() => {});
            await Promise.resolve();

            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    consentManaged: false,
                    consentHeuristicEnabled: null,
                    cpmStage: 'settings_missing',
                    cpmErrors: new Set(),
                    cpmConfigVersion: '7',
                }),
            );
        });

        it('reports setting_disabled when the user setting disables autoconsent', async () => {
            const mockMessaging = createMockMessaging({ autoconsentSettingEnabled: false });
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });

            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    consentManaged: false,
                    consentHeuristicEnabled: null,
                    cpmStage: 'setting_disabled',
                    cpmErrors: new Set(),
                    cpmConfigVersion: '1',
                }),
            );
        });

        it('reports site_disabled when autoconsent is disabled for the site', async () => {
            const mockMessaging = createMockMessaging({ autoconsentEnabledForSite: false });
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });

            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    consentManaged: false,
                    consentHeuristicEnabled: null,
                    cpmStage: 'site_disabled',
                    cpmErrors: new Set(),
                    cpmConfigVersion: '1',
                }),
            );
        });

        it('reports init_received on accepted top-frame init', async () => {
            const mockMessaging = createMockMessaging({ subfeatureEnabled: true });
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });

            // Wait for the queued CPM state mutation and the `.then(refreshDashboardState)` callback.
            await cpm.modifyCpmState(() => {});
            await Promise.resolve();

            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    consentManaged: false,
                    consentHeuristicEnabled: true,
                    cpmStage: 'init_received',
                    cpmErrors: new Set(),
                    cpmConfigVersion: '1',
                }),
            );
        });

        it('reports popup_found when a popup is found', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: {
                    type: 'popupFound',
                    cmp: 'test-cmp',
                },
            });

            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    consentManaged: false,
                    cpmStage: 'popup_found',
                    cpmErrors: new Set(),
                    cpmConfigVersion: '1',
                }),
            );
        });

        it('reports multiple_cmps when multiple CMPs are detected', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: {
                    type: 'autoconsentError',
                    details: {
                        msg: 'Found multiple CMPs',
                    },
                },
            });

            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    consentManaged: false,
                    cpmStage: 'init_received',
                    cpmErrors: new Set(['multiple_cmps']),
                    cpmConfigVersion: '1',
                }),
            );
        });

        it('includes native message errors from the diagnostics error handler', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            mockMessaging.diagnosticsErrorHandler(1, 'tab_isFeatureEnabled');
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: {
                    type: 'popupFound',
                    cmp: 'test-cmp',
                },
            });

            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    cpmStage: 'popup_found',
                    cpmErrors: new Set(['tab_isFeatureEnabled']),
                    cpmConfigVersion: '1',
                }),
            );
        });

        it('deduplicates cpmErrors in dashboard state', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;
            mockMessaging.diagnosticsErrorHandler(1, 'tab_isFeatureEnabled');
            mockMessaging.diagnosticsErrorHandler(1, 'tab_isFeatureEnabled');
            await cpm.modifyCpmState(() => {});

            const handler = messageHandlers.autoconsent;
            const multipleCmpsMessage = {
                autoconsentPayload: {
                    type: 'autoconsentError',
                    details: {
                        msg: 'Found multiple CMPs',
                    },
                },
            };
            await handler({}, makeSender({ frameId: 0 }), multipleCmpsMessage);
            await handler({}, makeSender({ frameId: 0 }), multipleCmpsMessage);

            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    cpmErrors: new Set(['tab_isFeatureEnabled', 'multiple_cmps']),
                }),
            );
        });

        it('restores persisted dashboard errors as Sets', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            await cpm.recordCpmDiagnosticError(1, 'tab_isFeatureEnabled');
            await cpm.recordCpmDiagnosticError(null, 'glob_getResourceIfNew');
            await cpm.updateCpmDashboardState(1, { cpmStage: 'popup_found', cpmConfigVersion: '1' });

            expect(sessionStorageFallback.get('cpmState').dashboardStates['1'].cpmErrors).toEqual([
                'glob_getResourceIfNew',
                'tab_isFeatureEnabled',
            ]);
            expect(sessionStorageFallback.get('cpmState').globalErrors).toEqual(['glob_getResourceIfNew']);

            Object.keys(messageHandlers).forEach((k) => delete messageHandlers[k]);
            const restoredCpm = new CookiePromptManagement({ cpmMessaging: createMockMessaging() });
            const restoredState = await restoredCpm.getCpmState();

            expect(restoredState.dashboardStates['1'].cpmErrors).toEqual(new Set(['glob_getResourceIfNew', 'tab_isFeatureEnabled']));
            expect(restoredState.globalErrors).toEqual(new Set(['glob_getResourceIfNew']));
        });

        it('merges global errors into the next tab dashboard update', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            mockMessaging.diagnosticsErrorHandler(null, 'glob_getResourceIfNew');
            await cpm.modifyCpmState(() => {});

            const handler = messageHandlers.autoconsent;
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            await cpm.modifyCpmState(() => {});
            await Promise.resolve();

            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    cpmStage: 'init_received',
                    cpmErrors: new Set(['glob_getResourceIfNew']),
                    cpmConfigVersion: '1',
                }),
            );
        });

        it('reports optout_failed when opt out fails', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: {
                    type: 'optOutResult',
                    result: false,
                    cmp: 'test-cmp',
                },
            });

            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    consentManaged: true,
                    optoutFailed: true,
                    cpmStage: 'optout_failed',
                    consentRule: 'test-cmp',
                    cpmConfigVersion: '1',
                }),
            );
        });

        it('reports done when autoconsent completes', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: {
                    type: 'autoconsentDone',
                    cmp: 'test-cmp',
                    isCosmetic: false,
                },
            });

            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    consentManaged: true,
                    cosmetic: false,
                    optoutFailed: false,
                    cpmStage: 'done',
                    consentRule: 'test-cmp',
                    cpmConfigVersion: '1',
                }),
            );
        });
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
