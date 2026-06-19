import { filterCompactRules, evalSnippets } from '@duckduckgo/autoconsent';
import { consentomatic } from '@duckduckgo/autoconsent/rules/consentomatic.json';
import browser from 'webextension-polyfill';
import { getFromSessionStorage, setToSessionStorage, createAlarm } from '../wrapper';
import { registerMessageHandler } from '../message-registry';
import { registerContentScripts, unregisterContentScripts } from './mv3-content-script-injection';

/**
 * @typedef {Object} CpmState
 * @property {{
 *  patterns: Set<string>,
 *  onlyRules: Set<string>,
 *  both: Set<string>,
 * }} detectionCache
 * @property {Record<string, number>} summaryEvents
 * @property {Record<string, CpmDashboardState>} dashboardStates
 * @property {Set<string>} globalErrors
 */

/**
 * @typedef {Object} CpmDashboardState
 * @property {boolean} consentManaged
 * @property {boolean?} cosmetic
 * @property {boolean?} optoutFailed
 * @property {boolean?} selftestFailed
 * @property {boolean?} consentReloadLoop
 * @property {string?} consentRule
 * @property {boolean?} consentHeuristicEnabled
 * @property {CpmStage} cpmStage
 * @property {Set<string>} cpmErrors
 * @property {number=} cpmQueueSize
 * @property {string} cpmConfigVersion
 */

/**
 * @typedef {'not_started' | 'config_unavailable' | 'settings_missing' | 'setting_disabled' | 'site_disabled' | 'init_received' | 'popup_found' | 'optout_failed' | 'done'} CpmStage
 */

/**
 * Base interface for CPM communications with the "browser" side.
 * @typedef {{
 *  logMessage: (message: string) => Promise<void>;
 *  refreshDashboardState: (tabId: number, url: string, dashboardState: Partial<CpmDashboardState>) => Promise<void>;
 *  showCpmAnimation: (tabId: number, topUrl: string, isCosmetic: boolean) => Promise<void>;
 *  notifyPopupHandled: (tabId: number, msg: import('@duckduckgo/autoconsent').DoneMessage) => Promise<void>;
 *  checkAutoconsentSettingEnabled: (tabId?: number) => Promise<boolean>;
 *  checkAutoconsentEnabledForSite: (url: string, tabId?: number) => Promise<boolean>;
 *  checkSubfeatureEnabled: (subfeatureName: string, tabId?: number) => Promise<boolean>;
 *  sendPixel: (pixelName: string, type: 'standard' | 'daily', params: Record<string, any>) => Promise<void>;
 *  refreshRemoteConfig: () => Promise<import('@duckduckgo/privacy-configuration/schema/config.ts').CurrentGenericConfig?>;
 *  setDiagnosticsErrorHandler?: (handler: (tabId: number | null, errorName: string) => void) => void;
 * }} CPMMessagingBase
 */

/* global DEBUG, BUILD_TARGET */

/**
 * @type {import('@duckduckgo/autoconsent').Config['logs']}
 */
const logsConfig = {
    lifecycle: !!DEBUG,
    detectionsteps: false,
    errors: !!DEBUG,
    evals: false,
    messages: !!DEBUG,
    rulesteps: !!DEBUG,
    waits: !!DEBUG,
};

export default class CookiePromptManagement {
    static SUMMARY_ALARM_NAME = 'cpm-summary';
    static SUMMARY_DELAY_MINUTES = 2;

    static CPM_CONTENT_SCRIPT_ID = 'cookie-prompt-management-script';

    /**
     *
     * @param {{
     *  cpmMessaging: CPMMessagingBase
     * }} opts
     */
    constructor({ cpmMessaging }) {
        this.cpmMessaging = cpmMessaging;
        this.cpmMessaging.setDiagnosticsErrorHandler?.((tabId, errorName) => {
            this.recordCpmDiagnosticError(tabId, errorName);
        });
        this.scheduleConfigRefresh();

        // In the standalone Chrome extension, the CPM content script is not in
        // the manifest. We register it dynamically based on the remote config.
        if (BUILD_TARGET === 'chrome') {
            const remoteConfig = /** @type {import('./cpm-standalone-messaging').CPMStandaloneMessaging} */ (cpmMessaging).remoteConfig;
            remoteConfig.onUpdate(async () => {
                const enabled = remoteConfig.isFeatureEnabled('autoconsent');
                const existingScripts = await chrome.scripting.getRegisteredContentScripts({
                    ids: [CookiePromptManagement.CPM_CONTENT_SCRIPT_ID],
                });
                const cpmScriptExists = existingScripts.length > 0;
                if (enabled && !cpmScriptExists) {
                    console.log('registering CPM content script');
                    await registerContentScripts([
                        {
                            id: CookiePromptManagement.CPM_CONTENT_SCRIPT_ID,
                            allFrames: true,
                            js: ['public/js/content-scripts/cpm.js'],
                            runAt: 'document_start',
                            world: 'ISOLATED',
                            matches: ['*://*/*'],
                            matchOriginAsFallback: true,
                        },
                    ]);
                } else if (!enabled && cpmScriptExists) {
                    console.log('unregistering CPM content script');
                    await unregisterContentScripts([CookiePromptManagement.CPM_CONTENT_SCRIPT_ID]);
                }
            });
        }

        // Ephemeral state for reload loop prevention. We assume that service worker never sleeps during a reload loop, so we don't persist these.
        /** @type {Map<number, URL>} */
        this._tabUrlsCache = new Map(); // top URL per tab
        /** @type {Map<number, string>} */
        this._lastHandledCMP = new Map(); // last handled CMP per tab
        /** @type {Set<number>} */
        this._reloadLoopDetected = new Set(); // tabs with detected reload loops

        // queue for CPM state mutations
        /** @type {Promise<void>} */
        this._stateQueue = Promise.resolve();
        // restore the current CPM state from storage
        this.getCpmState();

        // Set up alarm listener for summary pixel
        browser.alarms.onAlarm.addListener(async (alarm) => {
            if (alarm.name === CookiePromptManagement.SUMMARY_ALARM_NAME) {
                // WebKit has a bug where the alarm is not cleared automatically, so we have to clear it ourselves
                await browser.alarms.clear(CookiePromptManagement.SUMMARY_ALARM_NAME);
                await this.sendSummaryPixel();
            }
        });

        // make sure we send the summary pixels before the extension is unloaded
        // Note: browser.runtime.onSuspend is undefined in WebKit
        browser.runtime.onSuspend?.addListener(() => {
            this.sendSummaryPixel();
        });

        // Register autoconsent message handler with the shared message registry.
        // MessageRouter (in both regular and embedded builds) dispatches to this handler.
        registerMessageHandler('autoconsent', (options, sender, req) => {
            DEBUG && console.log(`received autoconsent message: ${req.autoconsentPayload.type}`);
            return this.handleAutoConsentMessage(req.autoconsentPayload, sender).then(() => {
                DEBUG && console.log(`handled autoconsent message: ${req.autoconsentPayload.type}`);
            });
        });
    }

    scheduleConfigRefresh() {
        /** @type {Promise<import('@duckduckgo/privacy-configuration/schema/config.ts').CurrentGenericConfig?>} */
        this.remoteConfigJson = this.cpmMessaging.refreshRemoteConfig().catch((e) => {
            // make sure remoteConfigJson is never rejected
            return null;
        });
    }

    /**
     * make sure we deserialize the cpmErrors as a Set
     * @param {Record<string, any>} jsonDashboardStates
     * @returns {Record<string, CpmDashboardState>}
     */
    _deserializeCpmDashboardStates(jsonDashboardStates) {
        return Object.fromEntries(
            Object.entries(jsonDashboardStates || {}).map(([tabId, dashboardState]) => [
                tabId,
                {
                    ...dashboardState,
                    cpmErrors: new Set(dashboardState.cpmErrors || []),
                },
            ]),
        );
    }

    /**
     * make sure we serialize the cpmErrors as an array
     * @param {Record<string, CpmDashboardState>} dashboardStates
     * @returns {Record<string, object>}
     */
    _serializeCpmDashboardStates(dashboardStates) {
        return Object.fromEntries(
            Object.entries(dashboardStates).map(([tabId, dashboardState]) => [
                tabId,
                {
                    ...dashboardState,
                    cpmErrors: Array.from(dashboardState.cpmErrors),
                },
            ]),
        );
    }

    /**
     * @param {any} jsonCpmState
     * @returns {CpmState}
     */
    _deserializeCpmState(jsonCpmState) {
        return {
            detectionCache: {
                patterns: new Set(jsonCpmState.detectionCache?.patterns || []),
                both: new Set(jsonCpmState.detectionCache?.both || []),
                onlyRules: new Set(jsonCpmState.detectionCache?.onlyRules || []),
            },
            summaryEvents: structuredClone(jsonCpmState.summaryEvents || {}),
            dashboardStates: this._deserializeCpmDashboardStates(jsonCpmState.dashboardStates || {}),
            globalErrors: new Set(jsonCpmState.globalErrors || []),
        };
    }

    /**
     * @param {CpmState} cpmState
     * @returns {object}
     */
    _serializeCpmState(cpmState) {
        return {
            detectionCache: {
                patterns: Array.from(cpmState.detectionCache.patterns),
                both: Array.from(cpmState.detectionCache.both),
                onlyRules: Array.from(cpmState.detectionCache.onlyRules),
            },
            summaryEvents: structuredClone(cpmState.summaryEvents),
            dashboardStates: this._serializeCpmDashboardStates(cpmState.dashboardStates),
            globalErrors: Array.from(cpmState.globalErrors),
        };
    }

    /**
     * @returns {Promise<CpmState>}
     */
    async getCpmState() {
        if (!this._jsonCpmState) {
            this._jsonCpmState = (await getFromSessionStorage('cpmState')) || {
                detectionCache: {
                    patterns: [],
                    both: [],
                    onlyRules: [],
                },
                summaryEvents: {},
                dashboardStates: {},
                globalErrors: [],
            };
        }
        return this._deserializeCpmState(this._jsonCpmState);
    }

    /**
     * @param {number=} tabId
     */
    checkHeuristicActionEnabled(tabId) {
        return this.cpmMessaging.checkSubfeatureEnabled('heuristicAction', tabId);
    }

    /**
     * @param {CpmState} newState
     */
    async updateCpmState(newState) {
        this._jsonCpmState = this._serializeCpmState(newState);
        try {
            await setToSessionStorage('cpmState', this._jsonCpmState);
        } catch (e) {
            // this can happen if quota is exceeded
            this.cpmMessaging.logMessage(`error setting cpmState to session storage: ${e}`);
        }
    }

    /**
     * Atomically read-modify-write the CPM state.
     * All state mutations are serialized through this method to prevent race conditions
     * between parallel message handlers.
     *
     * IMPORTANT: The callback must NOT await other methods that call
     * modifyCpmState (e.g. firePixel), as that would deadlock the queue.
     * Non-awaited calls are fine -- they simply queue up after the current operation.
     *
     * @param {(state: CpmState) => void | Promise<void>} fn
     * @returns {Promise<void>}
     */
    modifyCpmState(fn) {
        const op = this._stateQueue.then(async () => {
            const state = await this.getCpmState();
            await fn(state);
            await this.updateCpmState(state);
        });
        // ignore errors from the queue
        this._stateQueue = op.catch((e) => {
            this.cpmMessaging.logMessage(`error in state queue: ${e}`);
        });
        return op;
    }

    /**
     * @param {number} tabId
     */
    clearReloadLoopState(tabId) {
        this._lastHandledCMP.delete(tabId);
        this._reloadLoopDetected.delete(tabId);
    }

    /**
     * @param {number} tabId
     * @param {string} url
     * @returns {URL}
     */
    updateTopUrl(tabId, url) {
        const oldTopUrl = this._tabUrlsCache.get(tabId) || new URL('about:blank');
        /** @type {URL | null} */
        let newTopUrl = null;
        try {
            newTopUrl = new URL(url);
        } catch (e) {
            this.cpmMessaging.logMessage(`invalid top URL: ${url}: ${e}`);
            return oldTopUrl;
        }

        this.cpmMessaging.logMessage(`${tabId} Main frame navigated from ${oldTopUrl} to ${newTopUrl}`);
        if (oldTopUrl.host !== newTopUrl.host || oldTopUrl.pathname !== newTopUrl.pathname || oldTopUrl.protocol !== newTopUrl.protocol) {
            // url has changed (as far as reload loop prevention is concerned)
            this.clearReloadLoopState(tabId);
            // no await; state mutations are serialized and the next dashboard update will queue after this reset
            this.resetCpmDashboardState(tabId);
        }
        this._tabUrlsCache.set(tabId, newTopUrl);
        return newTopUrl;
    }

    /**
     * @returns {CpmDashboardState}
     */
    defaultCpmDashboardState() {
        return {
            consentManaged: false,
            cosmetic: null,
            optoutFailed: null,
            selftestFailed: null,
            consentReloadLoop: false,
            consentRule: null,
            consentHeuristicEnabled: null,
            cpmStage: 'not_started',
            cpmErrors: new Set(),
            cpmConfigVersion: '',
        };
    }

    /**
     * @param {number} tabId
     */
    resetCpmDashboardState(tabId) {
        this.modifyCpmState((cpmState) => {
            cpmState.dashboardStates[`${tabId}`] = this.defaultCpmDashboardState();
        });
    }

    /**
     * Record a diagnostic error in the CPM dashboard state (extension side only).
     * @param {number | null} tabId
     * @param {string} errorName
     * @returns {Promise<CpmDashboardState | null>}
     */
    async recordCpmDiagnosticError(tabId, errorName) {
        /** @type {CpmDashboardState | null} */
        let updatedDashboardState = null;
        // just modify the state. We don't trigger the dashboard update to avoid recursive calls.
        await this.modifyCpmState((cpmState) => {
            if (typeof tabId === 'number') {
                const key = `${tabId}`;
                cpmState.dashboardStates[key] ||= this.defaultCpmDashboardState();
                const dashboardState = cpmState.dashboardStates[key];
                dashboardState.cpmErrors.add(errorName);
                dashboardState.cpmErrors = new Set([...cpmState.globalErrors, ...dashboardState.cpmErrors]);
                updatedDashboardState = structuredClone(dashboardState);
            } else {
                cpmState.globalErrors.add(errorName);
            }
        });
        return updatedDashboardState;
    }

    /**
     * Atomically read-modify-write the CPM dashboard state  (extension side only).
     * @param {number} tabId
     * @param {Partial<Omit<CpmDashboardState, 'cpmErrors'>>} updates - cpmErrors should be updated with recordCpmDiagnosticError
     * @returns {Promise<CpmDashboardState>}
     */
    async updateCpmDashboardState(tabId, updates) {
        /** @type {CpmDashboardState} */
        let updatedDashboardState = this.defaultCpmDashboardState();
        await this.modifyCpmState((cpmState) => {
            const key = `${tabId}`;
            cpmState.dashboardStates[key] ||= this.defaultCpmDashboardState();
            const dashboardState = cpmState.dashboardStates[key];
            Object.assign(dashboardState, updates);
            // add global errors so they get pushed to native in the next update
            dashboardState.cpmErrors = new Set([...cpmState.globalErrors, ...dashboardState.cpmErrors]);
            updatedDashboardState = structuredClone(dashboardState);
        });
        return updatedDashboardState;
    }

    /**
     * @param {number} tabId
     * @param {string} cmp
     * @param {boolean} isCosmetic
     */
    rememberLastHandledCMP(tabId, cmp, isCosmetic) {
        if (isCosmetic) {
            // Cosmetic rules can trigger on every page load and never cause reload loops
            DEBUG && console.log('cosmetic rule handled, not storing for reload loop detection', tabId, cmp);
            this.clearReloadLoopState(tabId);
            return;
        }
        const lastHandledCMP = this._lastHandledCMP.get(tabId);
        if (lastHandledCMP !== cmp) {
            // The last handled CMP is different from the current one, so we need to clear the reload loop state
            DEBUG && console.log('last handled CMP is changed from', lastHandledCMP, 'to', cmp, 'clearing reload loop state', tabId);
            this.clearReloadLoopState(tabId);
        }
        DEBUG && console.log('recording popup handled: CMP', cmp, 'on', this._tabUrlsCache.get(tabId), 'tabId:', tabId);
        this._lastHandledCMP.set(tabId, cmp);
    }

    /**
     * @param {number} tabId
     * @param {string} cmp
     */
    detectReloadLoop(tabId, cmp) {
        // Reload loop is when we catch the same CMP from the same top URL without a navigation in between.
        // At this point we know that the top URL hasn't changed (that's tracked in updateTopUrl), so we can just check the CMP name.
        const lastHandledCMP = this._lastHandledCMP.get(tabId);
        if (!this._reloadLoopDetected.has(tabId) && lastHandledCMP === cmp) {
            // Same CMP detected on same URL after it was already handled - reload loop detected
            this.cpmMessaging.logMessage(`reload loop detected: ${cmp} on ${this._tabUrlsCache.get(tabId)} tabId: ${tabId}`);
            this._reloadLoopDetected.add(tabId);
            this.firePixel('error_reload-loop');
        }
    }

    /**
     * Called on EVERY message from the content script.
     * Make sure not to trigger anything heavy (e.g. native messaging) without a message type filter!
     * @param {import('@duckduckgo/autoconsent').ContentScriptMessage} msg
     * @param {browser.Runtime.MessageSender} sender
     * @returns
     */
    async handleAutoConsentMessage(msg, sender) {
        const frameId = sender.frameId;
        if (!sender.tab || typeof frameId !== 'number') {
            this.cpmMessaging.logMessage(`Invalid frameId ${frameId} or tab ${sender.tab}`);
            return;
        }
        const tabId = sender.tab.id;
        if (typeof tabId !== 'number') {
            this.cpmMessaging.logMessage(`Invalid tabId ${tabId}`);
            return;
        }
        const isMainFrame = frameId === 0;
        // @ts-expect-error - origin is not available in the type
        const frameUrl = sender.url || sender.origin || 'about:blank';
        const tabUrl = sender.tab.url || sender.tab.pendingUrl || 'about:blank';
        if (msg.type === 'init' && isMainFrame) {
            // update the cached top url for this tab
            this.updateTopUrl(tabId, tabUrl);
        }

        // use the cached config
        const remoteConfig = await this.remoteConfigJson;
        if (!remoteConfig) {
            this.cpmMessaging.logMessage('Remote config not ready, scheduling retry');
            this.scheduleConfigRefresh();
            if (isMainFrame) {
                this.cpmMessaging.refreshDashboardState(
                    tabId,
                    tabUrl,
                    await this.updateCpmDashboardState(tabId, {
                        cpmStage: 'config_unavailable',
                        cpmConfigVersion: 'unknown',
                    }),
                );
            }
            return;
        }
        const cpmConfigVersion = `${remoteConfig.version || 'unknown'}`;
        const autoconsentRemoteConfig = remoteConfig.features?.autoconsent;
        const autoconsentSettings = autoconsentRemoteConfig?.settings;
        DEBUG &&
            console.log(
                'received autoconsent message',
                msg.type,
                msg,
                'sender:',
                sender,
                'autoconsentRemoteConfig:',
                autoconsentRemoteConfig,
            );

        if (!autoconsentSettings) {
            this.cpmMessaging.logMessage(`autoconsentSettings not ready: ${autoconsentSettings}`);
            if (isMainFrame) {
                this.cpmMessaging.refreshDashboardState(
                    tabId,
                    tabUrl,
                    await this.updateCpmDashboardState(tabId, {
                        cpmStage: 'settings_missing',
                        cpmConfigVersion,
                    }),
                );
            }
            return;
        }

        switch (msg.type) {
            case 'init': {
                const autoconsentFeatureEnabled = await this.cpmMessaging.checkAutoconsentSettingEnabled(tabId);
                if (!autoconsentFeatureEnabled) {
                    this.cpmMessaging.logMessage('autoconsent setting not enabled');
                    if (isMainFrame) {
                        this.cpmMessaging.refreshDashboardState(
                            tabId,
                            tabUrl,
                            await this.updateCpmDashboardState(tabId, {
                                cpmStage: 'setting_disabled',
                                cpmConfigVersion,
                            }),
                        );
                    }
                    return;
                }

                const isEnabled = await this.cpmMessaging.checkAutoconsentEnabledForSite(tabUrl, tabId);
                if (!isEnabled) {
                    this.cpmMessaging.logMessage(`autoconsent disabled for site: ${tabUrl}`);
                    if (isMainFrame) {
                        this.cpmMessaging.refreshDashboardState(
                            tabId,
                            tabUrl,
                            await this.updateCpmDashboardState(tabId, {
                                cpmStage: 'site_disabled',
                                cpmConfigVersion,
                            }),
                        );
                        this.firePixel('disabled-for-site');
                    }
                    return;
                }

                if (isMainFrame) {
                    // schedule config refresh (will be used next time)
                    this.scheduleConfigRefresh();
                }

                const heuristicActionEnabled = await this.checkHeuristicActionEnabled(tabId);
                const visualTest = DEBUG;

                /** @type {import('@duckduckgo/autoconsent').Config['autoAction']} */
                let autoAction = 'optOut';
                // disable autoAction in case of reload loop
                if (this._reloadLoopDetected.has(tabId)) {
                    this.cpmMessaging.logMessage(`reload loop detected, disabling autoAction: ${tabId}`);
                    autoAction = null;
                }

                if (isMainFrame) {
                    // no await
                    this.updateCpmDashboardState(tabId, {
                        consentReloadLoop: this._reloadLoopDetected.has(tabId),
                        consentRule: this._lastHandledCMP.get(tabId) || null,
                        consentHeuristicEnabled: heuristicActionEnabled,
                        cpmStage: 'init_received',
                        cpmConfigVersion,
                    }).then((dashboardState) => this.cpmMessaging.refreshDashboardState(tabId, tabUrl, dashboardState));
                    // no await
                    this.firePixel('init');
                }

                /**
                 * @type {Partial<import('@duckduckgo/autoconsent').Config>}
                 */
                const autoconsentConfig = {
                    enabled: isEnabled,
                    autoAction,
                    detectRetries: 20,
                    isMainWorld: false,
                    disabledCmps: autoconsentSettings.disabledCMPs || [],
                    enablePrehide: true,
                    prehideTimeout: 2000,
                    enableCosmeticRules: true,
                    enableGeneratedRules: true,
                    enableFilterList: false,
                    enableHeuristicDetection: true,
                    enableHeuristicAction: heuristicActionEnabled,
                    visualTest,
                    logs: logsConfig,
                };
                const compactRuleList = autoconsentSettings.compactRuleList;
                const rules = {
                    autoconsent: [],
                    consentomatic,
                };
                if (compactRuleList) {
                    if (compactRuleList.index) {
                        rules.compact = filterCompactRules(
                            /** @type {import('@duckduckgo/autoconsent').IndexedCMPRuleset} */
                            (compactRuleList),
                            {
                                // use the frame URL here because rules are filtered by frame context
                                url: frameUrl,
                                mainFrame: isMainFrame,
                            },
                        );
                    } else {
                        rules.compact = compactRuleList;
                    }
                }
                DEBUG && console.log('autoconsent config', autoconsentConfig);

                chrome.tabs.sendMessage(
                    tabId,
                    {
                        type: 'initResp',
                        rules,
                        config: autoconsentConfig,
                    },
                    {
                        frameId,
                    },
                );
                break;
            }
            case 'cmpDetected': {
                break;
            }
            case 'popupFound': {
                this.cpmMessaging.refreshDashboardState(
                    tabId,
                    tabUrl,
                    await this.updateCpmDashboardState(tabId, {
                        cpmStage: 'popup_found',
                        consentRule: msg.cmp,
                    }),
                );
                this.firePixel('popup-found');
                // Check for reload loop
                this.detectReloadLoop(tabId, msg.cmp);
                break;
            }
            case 'optOutResult': {
                if (!msg.result) {
                    this.firePixel('error_optout');
                    this.cpmMessaging.refreshDashboardState(
                        tabId,
                        tabUrl,
                        await this.updateCpmDashboardState(tabId, {
                            consentManaged: true,
                            optoutFailed: true,
                            selftestFailed: null,
                            consentRule: msg.cmp,
                            cpmStage: 'optout_failed',
                        }),
                    );
                } else {
                    // TODO: implement self-tests
                }
                break;
            }
            case 'autoconsentDone': {
                // Remember the last handled CMP for reload loop detection
                this.rememberLastHandledCMP(tabId, msg.cmp, msg.isCosmetic);
                this.cpmMessaging.refreshDashboardState(
                    tabId,
                    tabUrl,
                    await this.updateCpmDashboardState(tabId, {
                        consentManaged: true,
                        cosmetic: msg.isCosmetic,
                        optoutFailed: false,
                        consentRule: msg.cmp,
                        cpmStage: 'done',
                    }),
                );
                if (msg.cmp === 'HEURISTIC') {
                    this.firePixel('done_heuristic');
                } else {
                    this.firePixel(msg.isCosmetic ? 'done_cosmetic' : 'done');
                }
                this.cpmMessaging.showCpmAnimation(tabId, tabUrl, msg.isCosmetic);
                this.firePixel(msg.isCosmetic ? 'animation-shown_cosmetic' : 'animation-shown');
                this.cpmMessaging.notifyPopupHandled(tabId, msg);
                break;
            }
            case 'report': {
                const state = msg.state || {};
                const detectedByPatterns = state.heuristicPatterns?.length > 0;
                const detectedBySnippets = state.heuristicSnippets?.length > 0;
                const detectedPopups = state.detectedPopups?.length > 0;
                const heuristicMatch = detectedByPatterns || detectedBySnippets;
                await this.modifyCpmState((cpmState) => {
                    if (isMainFrame && heuristicMatch && !cpmState.detectionCache.patterns.has(msg.instanceId)) {
                        cpmState.detectionCache.patterns.add(msg.instanceId);
                        // no await to avoid deadlock
                        this.firePixel('detected-by-patterns');
                    }
                    if (isMainFrame && detectedPopups) {
                        if (heuristicMatch && !cpmState.detectionCache.both.has(msg.instanceId)) {
                            cpmState.detectionCache.both.add(msg.instanceId);
                            // no await to avoid deadlock
                            this.firePixel('detected-by-both');
                        } else if (!heuristicMatch && !cpmState.detectionCache.onlyRules.has(msg.instanceId)) {
                            cpmState.detectionCache.onlyRules.add(msg.instanceId);
                            // no await to avoid deadlock
                            this.firePixel('detected-only-rules');
                        }
                    }
                });
                break;
            }
            case 'eval': {
                if (typeof msg.snippetId !== 'undefined') {
                    this.evalInTab(tabId, frameId, msg.snippetId).then(([result]) => {
                        if (logsConfig.evals) {
                            console.groupCollapsed(`eval result for ${frameUrl}`);
                            console.log(msg.code, result.result);
                            console.groupEnd();
                        }
                        chrome.tabs.sendMessage(
                            tabId,
                            {
                                id: msg.id,
                                type: 'evalResp',
                                result: result.result,
                            },
                            {
                                frameId,
                            },
                        );
                    });
                }
                break;
            }
            case 'autoconsentError': {
                if (msg.details?.msg?.includes('Found multiple CMPs')) {
                    const dashboardState = await this.recordCpmDiagnosticError(tabId, 'multiple_cmps');
                    if (dashboardState) {
                        this.cpmMessaging.refreshDashboardState(tabId, tabUrl, dashboardState);
                    }
                    this.firePixel('error_multiple-popups');
                }
                break;
            }
            case 'visualDelay': {
                console.log('visualDelay', msg);
                break;
            }
            default:
                this.cpmMessaging.logMessage(`Unhandled autoconsent message type: ${msg.type}`);
                break;
        }
    }

    /**
     *
     * @param {number} tabId
     * @param {number} frameId
     * @param {keyof typeof evalSnippets} snippetId
     * @returns {Promise<chrome.scripting.InjectionResult<boolean>[]>}
     */
    async evalInTab(tabId, frameId, snippetId) {
        return chrome.scripting.executeScript({
            target: {
                tabId,
                frameIds: [frameId],
            },
            world: 'MAIN',
            func: evalSnippets[snippetId],
        });
    }

    async firePixel(eventName) {
        this.modifyCpmState((cpmState) => {
            cpmState.summaryEvents[eventName] = (cpmState.summaryEvents[eventName] || 0) + 1;
        });

        // schedule summary alarm if not already scheduled (createAlarm checks for existing alarm)
        createAlarm(CookiePromptManagement.SUMMARY_ALARM_NAME, {
            delayInMinutes: CookiePromptManagement.SUMMARY_DELAY_MINUTES,
        });

        // request "daily" pixel firing
        const pixelName = `autoconsent_${eventName}`;
        this.cpmMessaging.sendPixel(pixelName, 'daily', {
            consentHeuristicEnabled: (await this.checkHeuristicActionEnabled()) ? '1' : '0',
            fromExtension: '1',
        });
    }

    async sendSummaryPixel() {
        let summaryEvents = {};
        await this.modifyCpmState((cpmState) => {
            summaryEvents = structuredClone(cpmState.summaryEvents);
            cpmState.summaryEvents = {};
            cpmState.detectionCache.patterns.clear();
            cpmState.detectionCache.both.clear();
            cpmState.detectionCache.onlyRules.clear();
        });
        this.cpmMessaging.sendPixel('autoconsent_summary', 'standard', {
            ...summaryEvents,
            consentHeuristicEnabled: (await this.checkHeuristicActionEnabled()) ? '1' : '0',
            fromExtension: '1',
        });
    }
}
