import CookiePromptManagement from '../../shared/js/background/components/cookie-prompt-management';
import messageHandlers from '../../shared/js/background/message-registry';
import { sessionStorageFallback, setToSessionStorage } from '../../shared/js/background/wrapper';

/**
 * Create a mock CPMMessagingBase with spies.
 */
function createMockMessaging({ autoconsentEnabledForSite = true, autoconsentSettingEnabled = true, subfeatureEnabled = false } = {}) {
    const mockMessaging = {
        logMessage: jasmine.createSpy('logMessage').and.returnValue(Promise.resolve()),
        refreshDashboardState: jasmine.createSpy('refreshDashboardState').and.returnValue(Promise.resolve()),
        showCpmAnimation: jasmine.createSpy('showCpmAnimation').and.returnValue(Promise.resolve()),
        notifyPopupHandled: jasmine.createSpy('notifyPopupHandled').and.returnValue(Promise.resolve()),
        checkAutoconsentSetting: jasmine.createSpy('checkAutoconsentSetting').and.returnValue(
            Promise.resolve({
                enabled: autoconsentSettingEnabled,
                userPreference: 'default',
                featureFlags: {
                    heuristicAction: true,
                },
            }),
        ),
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
                    cpmErrors: [],
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
                    cpmErrors: [],
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
                    consentHeuristicEnabled: true,
                    cpmStage: 'setting_disabled',
                    cpmErrors: [],
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
                    consentHeuristicEnabled: true,
                    cpmStage: 'site_disabled',
                    cpmErrors: [],
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
                    cpmErrors: [],
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
                    cpmErrors: [],
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
                    cpmErrors: ['multiple_cmps'],
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
                    cpmErrors: ['tab_isFeatureEnabled'],
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
                    cpmErrors: ['tab_isFeatureEnabled', 'multiple_cmps'],
                }),
            );
        });

        it('restores persisted dashboard errors as arrays', async () => {
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

            expect(restoredState.dashboardStates['1'].cpmErrors).toEqual(['glob_getResourceIfNew', 'tab_isFeatureEnabled']);
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
                    cpmErrors: ['glob_getResourceIfNew'],
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

        // A reload loop is detected on `popupFound` (after the main-frame `init` has already
        // pushed a dashboard update). The `done`/`optout_failed` updates that follow must
        // re-read `_reloadLoopDetected`, otherwise the native dashboard keeps showing
        // `consentReloadLoop: false` even though a loop was detected on the same load.
        it('reports consentReloadLoop in the done state when a reload loop is detected', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;

            // First visit primes the last-handled CMP used for reload-loop detection.
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: { type: 'autoconsentDone', cmp: 'test-cmp', isCosmetic: false },
            });

            // Same-URL reload with the same CMP: popupFound flags the reload loop.
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: { type: 'popupFound', cmp: 'test-cmp' },
            });
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: { type: 'autoconsentDone', cmp: 'test-cmp', isCosmetic: false },
            });

            expect(cpm._reloadLoopDetected.has(1)).toBe(true);
            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    consentManaged: true,
                    cpmStage: 'done',
                    consentReloadLoop: true,
                    consentRule: 'test-cmp',
                }),
            );
        });

        it('reports consentReloadLoop in the optout_failed state when a reload loop is detected', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;

            // First visit primes the last-handled CMP used for reload-loop detection.
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: { type: 'autoconsentDone', cmp: 'test-cmp', isCosmetic: false },
            });

            // Same-URL reload with the same CMP: popupFound flags the reload loop.
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: { type: 'popupFound', cmp: 'test-cmp' },
            });
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: { type: 'optOutResult', result: false, cmp: 'test-cmp' },
            });

            expect(cpm._reloadLoopDetected.has(1)).toBe(true);
            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    consentManaged: true,
                    optoutFailed: true,
                    cpmStage: 'optout_failed',
                    consentReloadLoop: true,
                    consentRule: 'test-cmp',
                }),
            );
        });

        // The done state must be authoritative: `rememberLastHandledCMP` runs before the done
        // dashboard update and can clear the reload-loop state (e.g. when a different CMP is
        // handled). The `true` that popupFound persisted must not leak through.
        it('clears consentReloadLoop in the done state when a different CMP is handled after a detected loop', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;

            // First visit primes the last-handled CMP.
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: { type: 'autoconsentDone', cmp: 'cmp-a', isCosmetic: false },
            });

            // Same-URL reload: popupFound for the same CMP flags the reload loop...
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: { type: 'popupFound', cmp: 'cmp-a' },
            });
            expect(cpm._reloadLoopDetected.has(1)).toBe(true);

            // ...but a different CMP is then handled, which resets the loop state.
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: { type: 'autoconsentDone', cmp: 'cmp-b', isCosmetic: false },
            });

            expect(cpm._reloadLoopDetected.has(1)).toBe(false);
            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    consentManaged: true,
                    cpmStage: 'done',
                    consentReloadLoop: false,
                    consentRule: 'cmp-b',
                }),
            );
        });

        // The primary purpose of reload-loop detection: once a loop is detected, the next
        // init must tell the content script to stop auto-acting (autoAction: null) to break it.
        it('disables autoAction on the next init after a reload loop is detected', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const sendMessageSpy = spyOn(chrome.tabs, 'sendMessage');
            const handler = messageHandlers.autoconsent;

            const lastInitRespAutoAction = () => {
                const initResps = sendMessageSpy.calls.allArgs().filter(([, message]) => message?.type === 'initResp');
                return initResps.length ? initResps[initResps.length - 1][1].config.autoAction : undefined;
            };

            // First visit: opt-out is active, then the CMP is handled (primes last-handled CMP).
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            expect(lastInitRespAutoAction()).toBe('optOut');
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: { type: 'autoconsentDone', cmp: 'test-cmp', isCosmetic: false },
            });

            // Same-URL reload with the same CMP: the loop is detected on popupFound.
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: { type: 'popupFound', cmp: 'test-cmp' },
            });
            expect(cpm._reloadLoopDetected.has(1)).toBe(true);

            // The following init must disable autoAction to break the loop.
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            expect(lastInitRespAutoAction()).toBe(null);
        });

        // When init itself detects the loop (and disables autoAction), its own dashboard update
        // must report the loop -- there is no popupFound/autoconsentDone to fall back on once
        // autoAction is disabled.
        it('reports consentReloadLoop in the init state after a loop was detected on a previous load', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;

            // First visit primes the last-handled CMP.
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: { type: 'autoconsentDone', cmp: 'test-cmp', isCosmetic: false },
            });

            // Same-URL reload with the same CMP: the loop is detected on popupFound.
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            await handler({}, makeSender({ frameId: 0 }), {
                autoconsentPayload: { type: 'popupFound', cmp: 'test-cmp' },
            });
            expect(cpm._reloadLoopDetected.has(1)).toBe(true);

            // The next init reports the loop in its own (init_received) dashboard update.
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });
            // Flush the queued reset + init dashboard update and the `.then(refreshDashboardState)` callback.
            await cpm.modifyCpmState(() => {});
            await Promise.resolve();

            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    cpmStage: 'init_received',
                    consentReloadLoop: true,
                    consentRule: 'test-cmp',
                }),
            );
        });

        it('resets stale outcome fields on a same-URL reload (main-frame init)', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            const handler = messageHandlers.autoconsent;

            // First visit: init then autoconsentDone, so the popup is reported as managed.
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
                }),
            );

            // Same-URL reload: a new main-frame init must reset the per-tab outcome fields,
            // otherwise the native dashboard would show consent as already managed before CPM re-runs.
            await handler({}, makeSender({ frameId: 0 }), { autoconsentPayload: makeInitMessage() });

            // Wait for the queued reset + init dashboard update and the `.then(refreshDashboardState)` callback.
            await cpm.modifyCpmState(() => {});
            await Promise.resolve();

            expect(latestDashboardState(mockMessaging)).toEqual(
                jasmine.objectContaining({
                    consentManaged: false,
                    cosmetic: null,
                    optoutFailed: null,
                    selftestFailed: null,
                    cpmStage: 'init_received',
                    // consentRule is intentionally retained across same-URL reloads for reload-loop detection.
                    consentRule: 'test-cmp',
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

    describe('site rank bucket', () => {
        const TOP_URL = 'https://www.top-site.example/page';
        const OTHER_URL = 'https://long-tail.example/page';

        function createSiteRankLookup() {
            return jasmine.createSpy('siteRankLookup').and.callFake((url) => (url.includes('top-site.example') ? 'top' : 'other'));
        }

        function summaryPixelParams(mockMessaging) {
            return mockMessaging.sendPixel.calls
                .allArgs()
                .filter(([name]) => name === 'autoconsent_summary')
                .map(([, , params]) => params);
        }

        async function handleMessages(cpm, messages) {
            const handler = messageHandlers.autoconsent;
            for (const [sender, msg] of messages) {
                await handler({}, sender, { autoconsentPayload: msg });
            }
            await cpm.modifyCpmState(() => {});
        }

        it('takes the bucket from the top-level URL, also for iframe messages', async () => {
            const mockMessaging = createMockMessaging();
            const siteRankLookup = createSiteRankLookup();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging, siteRankLookup });
            await cpm.remoteConfigJson;

            await handleMessages(cpm, [
                [makeSender({ tabUrl: TOP_URL }), makeInitMessage()],
                [
                    makeSender({ tabUrl: TOP_URL, frameId: 3, frameUrl: 'https://cmp.long-tail.example/frame' }),
                    { type: 'popupFound', cmp: 'test-cmp' },
                ],
                [
                    makeSender({ tabUrl: TOP_URL, frameId: 3, frameUrl: 'https://cmp.long-tail.example/frame' }),
                    { type: 'autoconsentDone', cmp: 'test-cmp', isCosmetic: false, url: 'https://cmp.long-tail.example/frame' },
                ],
            ]);

            const calledUrls = siteRankLookup.calls.allArgs().map(([url]) => url);
            expect(calledUrls.length).toBeGreaterThan(0);
            expect(calledUrls.every((url) => url === TOP_URL)).toBeTrue();
            const state = await cpm.getCpmState();
            expect(state.summaryEventsByRank).toEqual({
                top: { init: 1, 'popup-found': 1, done: 1, 'animation-shown': 1 },
            });
            expect(state.summaryEvents).toEqual({});
        });

        it('takes the bucket from the cached top URL for reload loop errors', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging, siteRankLookup: createSiteRankLookup() });
            await cpm.remoteConfigJson;

            const iframeSender = makeSender({ tabUrl: TOP_URL, frameId: 2, frameUrl: OTHER_URL });
            await handleMessages(cpm, [
                [makeSender({ tabUrl: TOP_URL }), makeInitMessage()],
                [iframeSender, { type: 'popupFound', cmp: 'test-cmp' }],
                [iframeSender, { type: 'autoconsentDone', cmp: 'test-cmp', isCosmetic: false, url: OTHER_URL }],
                [iframeSender, { type: 'popupFound', cmp: 'test-cmp' }],
            ]);

            const state = await cpm.getCpmState();
            expect(state.summaryEventsByRank.top?.['error_reload-loop']).toBe(1);
            expect(state.summaryEventsByRank.other).toBeUndefined();
        });

        it('sends one summary pixel per bucket, with totals equal to the recorded events', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging, siteRankLookup: createSiteRankLookup() });
            await cpm.remoteConfigJson;

            await handleMessages(cpm, [
                [makeSender({ tabId: 1, tabUrl: TOP_URL }), makeInitMessage()],
                [makeSender({ tabId: 2, tabUrl: OTHER_URL }), makeInitMessage()],
                [makeSender({ tabId: 3, tabUrl: OTHER_URL }), makeInitMessage()],
                [makeSender({ tabId: 3, tabUrl: OTHER_URL }), { type: 'popupFound', cmp: 'test-cmp' }],
            ]);
            await cpm.sendSummaryPixel();

            const params = summaryPixelParams(mockMessaging);
            expect(params.length).toBe(2);
            expect(params).toContain({ init: 1, siteRank: 'top', consentHeuristicEnabled: 'tier1', fromExtension: '1' });
            expect(params).toContain({
                init: 2,
                'popup-found': 1,
                siteRank: 'other',
                consentHeuristicEnabled: 'tier1',
                fromExtension: '1',
            });

            // counters are reset after sending
            const state = await cpm.getCpmState();
            expect(state.summaryEventsByRank).toEqual({});
        });

        it('does not put the URL or domain in any pixel', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging, siteRankLookup: createSiteRankLookup() });
            await cpm.remoteConfigJson;

            await handleMessages(cpm, [
                [makeSender({ tabUrl: TOP_URL }), makeInitMessage()],
                [makeSender({ tabUrl: TOP_URL }), { type: 'popupFound', cmp: 'test-cmp' }],
                [makeSender({ tabUrl: OTHER_URL, tabId: 2 }), makeInitMessage()],
            ]);
            await cpm.sendSummaryPixel();

            for (const [name, , params] of mockMessaging.sendPixel.calls.allArgs()) {
                const serialized = JSON.stringify({ name, params });
                expect(serialized).not.toContain('top-site');
                expect(serialized).not.toContain('long-tail');
                expect(serialized).not.toContain('example');
                expect(serialized).not.toContain('test-cmp');
                if (name !== 'autoconsent_summary') {
                    // daily pixels stay unchanged
                    expect(params.siteRank).toBeUndefined();
                }
            }
        });

        it('sends a single summary pixel without siteRank when there is no lookup', async () => {
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging });
            await cpm.remoteConfigJson;

            await handleMessages(cpm, [
                [makeSender({ tabId: 1, tabUrl: TOP_URL }), makeInitMessage()],
                [makeSender({ tabId: 2, tabUrl: OTHER_URL }), makeInitMessage()],
            ]);
            await cpm.sendSummaryPixel();

            expect(summaryPixelParams(mockMessaging)).toEqual([{ init: 2, consentHeuristicEnabled: 'tier1', fromExtension: '1' }]);
        });

        it('keeps counts from a stored state without buckets', async () => {
            await setToSessionStorage('cpmState', {
                detectionCache: { patterns: [], both: [], onlyRules: [] },
                summaryEvents: { init: 3, done: 1 },
                dashboardStates: {},
                globalErrors: [],
            });
            const mockMessaging = createMockMessaging();
            const cpm = new CookiePromptManagement({ cpmMessaging: mockMessaging, siteRankLookup: createSiteRankLookup() });
            await cpm.remoteConfigJson;

            await handleMessages(cpm, [[makeSender({ tabUrl: TOP_URL }), makeInitMessage()]]);
            await cpm.sendSummaryPixel();

            const params = summaryPixelParams(mockMessaging);
            expect(params.length).toBe(2);
            expect(params).toContain({ init: 3, done: 1, consentHeuristicEnabled: 'tier1', fromExtension: '1' });
            expect(params).toContain({ init: 1, siteRank: 'top', consentHeuristicEnabled: 'tier1', fromExtension: '1' });
        });
    });
});
