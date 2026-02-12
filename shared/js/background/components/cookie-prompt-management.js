// @ts-ignore - autoconsent doesn't export types
import { filterCompactRules, evalSnippets } from '@duckduckgo/autoconsent';
import browser from 'webextension-polyfill';
import { registerContentScripts } from './mv3-content-script-injection';
import { getFromSessionStorage, setToSessionStorage, createAlarm } from '../wrapper';
import { registerMessageHandler } from '../message-registry';

/**
 * @typedef {import('../tab-manager.js')} TabManager
 */

/**
 * @typedef {Object} CpmState
 * @property {Set<string>} sitesNotifiedCache
 * @property {{
 *  patterns: Set<string>,
 *  onlyRules: Set<string>,
 *  both: Set<string>,
 * }} detectionCache
 * @property {Record<string, number>} summaryEvents
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
 */

/**
 * Base interface for CPM communications with the "browser" side.
 * @typedef {{
 *  logMessage: (message: string) => Promise<void>;
 *  refreshDashboardState: (tabId: number, url: string, dashboardState: Partial<CpmDashboardState>) => Promise<void>;
 *  showCpmAnimation: (tabId: number, topUrl: string, isCosmetic: boolean) => Promise<void>;
 *  notifyPopupHandled: (tabId: number, msg: import('@duckduckgo/autoconsent/lib/messages').DoneMessage) => Promise<void>;
 *  checkAutoconsentSettingEnabled: () => Promise<boolean>;
 *  checkAutoconsentEnabledForSite: (url: string) => Promise<boolean>;
 *  checkSubfeatureEnabled: (subfeatureName: string) => Promise<boolean>;
 *  sendPixel: (pixelName: string, type: 'standard' | 'daily', params: Record<string, any>) => Promise<void>;
 *  refreshRemoteConfig: () => Promise<import('@duckduckgo/privacy-configuration/schema/config.ts').CurrentGenericConfig?>;
 * }} CPMMessagingBase
 */

/* global DEBUG */

/**
 * @type {import('@duckduckgo/autoconsent/lib/types').Config['logs']}
 */
const logsConfig = {
    lifecycle: true,
    detectionsteps: false,
    errors: true,
    evals: false,
    messages: true,
    rulesteps: true,
    waits: true,
};

export default class CookiePromptManagement {
    static SUMMARY_ALARM_NAME = 'cpm-summary';
    static SUMMARY_DELAY_MINUTES = 2;

    /**
     *
     * @param {{
     *  cpmMessaging: CPMMessagingBase
     * }} opts
     */
    constructor({ cpmMessaging }) {
        this.cpmMessaging = cpmMessaging;
        this.scheduleConfigRefresh();

        // Ephemeral state for reload loop prevention. We assume that service worker never sleeps during a reload loop, so we don't persist these.
        /** @type {Map<number, URL>} */
        this._tabUrlsCache = new Map(); // top URL per tab
        /** @type {Map<number, string>} */
        this._lastHandledCMP = new Map(); // last handled CMP per tab
        /** @type {Set<number>} */
        this._reloadLoopDetected = new Set(); // tabs with detected reload loops

        registerContentScripts([
            {
                id: 'cookie-prompt-management-script',
                js: ['public/js/content-scripts/cpm.js'],
                matches: ['<all_urls>'],
                runAt: 'document_end',
                world: 'ISOLATED',
                matchOriginAsFallback: true,
                allFrames: true,
            },
        ]);

        // queue for CPM state mutations
        /** @type {Promise<void>} */
        this._stateQueue = Promise.resolve();
        // restore the current CPM state from storage
        this.getCpmState();

        // Set up alarm listener for summary pixel
        browser.alarms.onAlarm.addListener((alarm) => {
            this.cpmMessaging.logMessage(`alarm triggered: ${JSON.stringify(alarm)}`);
            if (alarm.name === CookiePromptManagement.SUMMARY_ALARM_NAME) {
                this.sendSummaryPixel();
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
        this.remoteConfigJson = this.cpmMessaging.refreshRemoteConfig();
    }

    /**
     * @param {object} jsonCpmState
     * @returns {CpmState}
     */
    _deserializeCpmState(jsonCpmState) {
        return {
            sitesNotifiedCache: new Set(jsonCpmState.sitesNotifiedCache || []),
            detectionCache: {
                patterns: new Set(jsonCpmState.detectionCache?.patterns || []),
                both: new Set(jsonCpmState.detectionCache?.both || []),
                onlyRules: new Set(jsonCpmState.detectionCache?.onlyRules || []),
            },
            summaryEvents: structuredClone(jsonCpmState.summaryEvents || {}),
        };
    }

    /**
     * @param {CpmState} cpmState
     * @returns {object}
     */
    _serializeCpmState(cpmState) {
        return {
            sitesNotifiedCache: Array.from(cpmState.sitesNotifiedCache),
            detectionCache: {
                patterns: Array.from(cpmState.detectionCache.patterns),
                both: Array.from(cpmState.detectionCache.both),
                onlyRules: Array.from(cpmState.detectionCache.onlyRules),
            },
            summaryEvents: structuredClone(cpmState.summaryEvents),
        };
    }

    /**
     * @returns {Promise<CpmState>}
     */
    async getCpmState() {
        if (!this._jsonCpmState) {
            this._jsonCpmState = (await getFromSessionStorage('cpmState')) || {
                sitesNotifiedCache: [],
                detectionCache: {
                    patterns: [],
                    both: [],
                    onlyRules: [],
                },
                summaryEvents: {},
            };
        }
        return this._deserializeCpmState(this._jsonCpmState);
    }

    checkHeuristicActionEnabled() {
        return this.cpmMessaging.checkSubfeatureEnabled('heuristicAction');
    }

    /**
     * @param {CpmState} newState
     */
    async updateCpmState(newState) {
        this._jsonCpmState = this._serializeCpmState(newState);
        await setToSessionStorage('cpmState', this._jsonCpmState);
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
        let newTopUrl = null;
        try {
            newTopUrl = new URL(url);
        } catch (e) {
            this.cpmMessaging.logMessage(`invalid top URL: ${url}: ${e}`);
            return oldTopUrl;
        }

        DEBUG && this.cpmMessaging.logMessage(`${tabId} Main frame navigated from ${oldTopUrl} to ${newTopUrl}`);
        if (oldTopUrl.host !== newTopUrl.host || oldTopUrl.pathname !== newTopUrl.pathname || oldTopUrl.protocol !== newTopUrl.protocol) {
            // url has changed (as far as reload loop prevention is concerned)
            this.clearReloadLoopState(tabId);
        }
        this._tabUrlsCache.set(tabId, newTopUrl);
        return newTopUrl;
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
     *
     * @param {import('@duckduckgo/autoconsent/lib/messages').ContentScriptMessage} msg
     * @param {browser.Runtime.MessageSender} sender
     * @returns
     */
    async handleAutoConsentMessage(msg, sender) {
        const tabId = sender.tab?.id;
        const frameId = sender.frameId;
        if (typeof frameId !== 'number') {
            this.cpmMessaging.logMessage(`frameId is not a number: ${frameId}`);
            return;
        }
        const isMainFrame = frameId === 0;
        // @ts-expect-error - origin is not available in the type
        const senderUrl = sender.url || `${sender.origin}/`;
        let senderDomain = null;
        try {
            senderDomain = new URL(senderUrl).hostname;
        } catch (e) {
            this.cpmMessaging.logMessage(`error getting sender domain: ${e}`);
            return;
        }
        // use the cached config
        const remoteConfig = await this.remoteConfigJson;
        if (!remoteConfig) {
            this.cpmMessaging.logMessage('Remote config not ready');
            return;
        }
        const autoconsentRemoteConfig = remoteConfig.features.autoconsent;
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

        if (!autoconsentSettings || !tabId) {
            this.cpmMessaging.logMessage(`autoconsentSettings or tabId not ready: ${autoconsentSettings} ${tabId}`);
            return;
        }
        const autoconsentFeatureEnabled = await this.cpmMessaging.checkAutoconsentSettingEnabled();
        if (!autoconsentFeatureEnabled) {
            this.cpmMessaging.logMessage('autoconsent setting not enabled');
            return;
        }
        const heuristicActionEnabled = await this.checkHeuristicActionEnabled();
        let currentTopUrl = this._tabUrlsCache.get(tabId) || new URL('about:blank');

        switch (msg.type) {
            case 'init': {
                // do the navigation check before checking if the domain is allowlisted
                if (isMainFrame) {
                    currentTopUrl = this.updateTopUrl(tabId, senderUrl);
                    // schedule config refresh (will be used next time)
                    this.scheduleConfigRefresh();
                }

                const isEnabled = await this.cpmMessaging.checkAutoconsentEnabledForSite(currentTopUrl.toString());
                if (!isEnabled) {
                    this.cpmMessaging.logMessage(`autoconsent disabled for site: ${senderUrl}`);
                    this.firePixel('disabled-for-site');
                    return;
                }

                const visualTest = DEBUG;

                /** @type {import('@duckduckgo/autoconsent/lib/types').AutoAction} */
                let autoAction = 'optOut';
                // disable autoAction in case of reload loop
                if (this._reloadLoopDetected.has(tabId)) {
                    this.cpmMessaging.logMessage(`reload loop detected, disabling autoAction: ${tabId}`);
                    autoAction = null;
                }

                if (isMainFrame) {
                    // no await
                    this.cpmMessaging.refreshDashboardState(tabId, senderUrl, {
                        // keep "cookies managed" if we did it for this site since app launch
                        consentManaged: (await this.getCpmState()).sitesNotifiedCache.has(senderDomain),
                        cosmetic: null,
                        optoutFailed: null,
                        selftestFailed: null,
                        consentReloadLoop: this._reloadLoopDetected.has(tabId),
                        consentRule: this._lastHandledCMP.get(tabId) || null,
                        consentHeuristicEnabled: heuristicActionEnabled,
                    });
                    // no await
                    this.firePixel('init');
                }

                /**
                 * @type {Partial<import('@duckduckgo/autoconsent/lib/types').Config>}
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
                    consentomatic: [],
                    compact:
                        compactRuleList?.index !== undefined
                            ? filterCompactRules(compactRuleList, { url: senderUrl, mainFrame: isMainFrame })
                            : compactRuleList,
                };
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
                this.firePixel('popup-found');
                // Check for reload loop
                this.detectReloadLoop(tabId, msg.cmp);
                break;
            }
            case 'optOutResult': {
                if (!msg.result) {
                    this.firePixel('error_optout');
                    this.cpmMessaging.refreshDashboardState(tabId, senderUrl, {
                        consentManaged: true,
                        cosmetic: null,
                        optoutFailed: true,
                        selftestFailed: null,
                        consentReloadLoop: this._reloadLoopDetected.has(tabId),
                        consentRule: msg.cmp,
                        consentHeuristicEnabled: heuristicActionEnabled,
                    });
                } else {
                    // TODO: implement self-tests
                }
                break;
            }
            case 'autoconsentDone': {
                // Remember the last handled CMP for reload loop detection
                this.rememberLastHandledCMP(tabId, msg.cmp, msg.isCosmetic);
                this.cpmMessaging.refreshDashboardState(tabId, senderUrl, {
                    consentManaged: true,
                    cosmetic: msg.isCosmetic,
                    optoutFailed: false,
                    selftestFailed: null,
                    consentReloadLoop: this._reloadLoopDetected.has(tabId),
                    consentRule: msg.cmp,
                    consentHeuristicEnabled: heuristicActionEnabled,
                });
                if (msg.cmp === 'HEURISTIC') {
                    this.firePixel('done_heuristic');
                } else {
                    this.firePixel(msg.isCosmetic ? 'done_cosmetic' : 'done');
                }
                await this.modifyCpmState((cpmState) => {
                    cpmState.sitesNotifiedCache.add(senderDomain);
                });
                this.cpmMessaging.showCpmAnimation(tabId, currentTopUrl.toString(), msg.isCosmetic);
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
                            console.groupCollapsed(`eval result for ${senderUrl}`);
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
        });
    }
}
