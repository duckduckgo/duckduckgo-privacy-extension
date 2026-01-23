// @ts-ignore - autoconsent doesn't export types
import { filterCompactRules, evalSnippets } from '@duckduckgo/autoconsent';
import browser from 'webextension-polyfill';
import { registerContentScripts } from './mv3-content-script-injection';
import { sendPixelRequest } from '../pixels';
import { getFromSessionStorage, setToSessionStorage, createAlarm } from '../wrapper';
import defaultCompactRuleList from '@duckduckgo/autoconsent/rules/compact-rules.json';

/**
 * @typedef {import('../tab-manager.js')} TabManager
 */

/**
 * @typedef {Object} CpmState
 * @property {Record<number, {
 *  lastHandledCMPName: string | null,
 *  reloadLoopDetected: boolean,
 * }>} tabState
 * @property {Set<string>} sitesNotifiedCache
 * @property {{
 *  patterns: Set<string>,
 *  onlyRules: Set<string>,
 *  both: Set<string>,
 * }} detectionCache
 * @property {Record<string, number>} summaryEvents
 */

/* global DEBUG, BUILD_TARGET */

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
     *  remoteConfig: import('./remote-config').RemoteConfigInterface
     *  nativeMessaging: import('./native-messaging').default
     *  settings: import('../settings')
     * }} opts
     */
    constructor({ remoteConfig, nativeMessaging, settings }) {
        this.remoteConfig = remoteConfig;
        this.nativeMessaging = nativeMessaging;
        this.settings = settings;
        this._heuristicActionEnabled = null;

        registerContentScripts([
            {
                id: 'cookie-prompt-management-script',
                js: ['public/js/cpm.js'],
                matches: ['<all_urls>'],
                runAt: 'document_end',
                world: 'ISOLATED',
                matchOriginAsFallback: true,
                allFrames: true,
            },
        ])

        // restore the current CPM state from storage
        this.getCpmState();

        // Set up alarm listener for summary pixel
        browser.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === CookiePromptManagement.SUMMARY_ALARM_NAME) {
                this.sendSummaryPixel();
            }
        });

        // Embedded builds don't use MessageRouter, so we need to set up a direct message listener
        if (BUILD_TARGET === 'embedded') {
            browser.runtime.onMessage.addListener(async (req, sender) => {
                if (req.messageType === 'autoconsent') {
                    return this.handleAutoConsentMessage(req.autoconsentPayload, sender);
                }
            });
        }
    }

    /**
     * @param {object} jsonCpmState
     * @returns {CpmState}
     */
    _deserializeCpmState(jsonCpmState) {
        return {
            tabState: structuredClone(jsonCpmState.tabState || {}),
            sitesNotifiedCache: new Set(jsonCpmState.sitesNotifiedCache || []),
            detectionCache: {
                patterns: new Set(jsonCpmState.detectionCache?.patterns || []),
                both: new Set(jsonCpmState.detectionCache?.both || []),
                onlyRules: new Set(jsonCpmState.detectionCache?.onlyRules || []),
            },
            summaryEvents: structuredClone(jsonCpmState.summaryEvents || {}),
        }
    }

    /**
     * @param {CpmState} cpmState
     * @returns {object}
     */
    _serializeCpmState(cpmState) {
        return {
            tabState: structuredClone(cpmState.tabState),
            sitesNotifiedCache: Array.from(cpmState.sitesNotifiedCache),
            detectionCache: {
                patterns: Array.from(cpmState.detectionCache.patterns),
                both: Array.from(cpmState.detectionCache.both),
                onlyRules: Array.from(cpmState.detectionCache.onlyRules),
            },
            summaryEvents: structuredClone(cpmState.summaryEvents),
        }
    }

    /**
     * @returns {Promise<CpmState>}
     */
    async getCpmState() {
        if (!this._jsonCpmState) {
            this._jsonCpmState = (await getFromSessionStorage('cpmState')) || {
                tabState: {},
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


    async checkHeuristicActionEnabled(force = false) {
        if (this._heuristicActionEnabled === null || force) {
            this._heuristicActionEnabled = await this.checkSubfeatureEnabled('heuristicAction');
        }
        return this._heuristicActionEnabled;
    }

    /**
     * @param {CpmState} newState
     */
    async updateCpmState(newState) {
        this._jsonCpmState = this._serializeCpmState(newState);
        await setToSessionStorage('cpmState', this._jsonCpmState);
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
            console.error('frameId is not a number', frameId);
            return;
        }
        const isMainFrame = frameId === 0;
        // @ts-expect-error - origin is not available in the type
        const senderUrl = sender.url || `${sender.origin}/`;
        let senderDomain = null;
        try {
            senderDomain = new URL(senderUrl).hostname;
        } catch (e) {
            console.error('error getting sender domain', e);
            return;
        }
        await this.remoteConfig.ready;
        const autoconsentRemoteConfig = this.remoteConfig.config?.features.autoconsent;
        const autoconsentSettings = autoconsentRemoteConfig?.settings;
        console.log('received autoconsent message', msg.type, msg, 'sender:', sender, 'autoconsentRemoteConfig:', autoconsentRemoteConfig, 'defaultCompactRuleList:', defaultCompactRuleList);

        if (!autoconsentSettings || !tabId) {
            return;
        }
        const cpmState = await this.getCpmState();
        // force refresh the subfeature state on every 'init'
        const heuristicActionEnabled = await this.checkHeuristicActionEnabled(msg.type === 'init');

        switch (msg.type) {
            case 'init': {
                const isEnabled = await this.checkAutoconsentEnabledForSite(senderUrl);
                if (!isEnabled) {
                    this.firePixel('disabled-for-site');
                    return;
                }

                // FIXME: do a navigation check here for reload loop prevention

                const visualTest = DEBUG;
                // FIXME: implement reload loop prevention
                const autoAction = 'optOut';

                if (isMainFrame) {
                    // no await
                    this.refreshDashboardState(
                        tabId,
                        {
                            // keep "cookies managed" if we did it for this site since app launch
                            consentManaged: cpmState.sitesNotifiedCache.has(senderDomain),
                            cosmetic: null,
                            optoutFailed: null,
                            selftestFailed: null,
                            consentReloadLoop: false, // FIXME: reloadLoopDetected,
                            consentRule: '', // FIXME: lastHandledCMPName, // this will be non-null in case of a reload loop
                            consentHeuristicEnabled: heuristicActionEnabled
                        }
                    );
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
                const compactRuleList = autoconsentSettings.compactRuleList || defaultCompactRuleList;
                const rules = {
                    autoconsent: [],
                    consentomatic: [],
                    compact:
                        compactRuleList.index !== undefined
                            ? filterCompactRules(compactRuleList, { url: senderUrl, mainFrame: isMainFrame })
                            : compactRuleList,
                };

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
                // FIXME: reload loop prevention here
                break;
            }
            case 'optOutResult': {
                if (!msg.result) {
                    this.firePixel('error_optout');
                    this.refreshDashboardState(
                        tabId,
                        {
                            consentManaged: true,
                            cosmetic: null,
                            optoutFailed: true,
                            selftestFailed: null,
                            consentReloadLoop: false, // FIXME: reloadLoopDetected,
                            consentRule: msg.cmp,
                            consentHeuristicEnabled: heuristicActionEnabled
                        }
                    )
                } else {
                    // TODO: implement self-tests
                }
                break;
            }
            case 'autoconsentDone': {
                // FIXME: remember last CMP for reload loop prevention here
                this.refreshDashboardState(
                    tabId,
                    {
                        consentManaged: true,
                        cosmetic: msg.isCosmetic,
                        optoutFailed: false,
                        selftestFailed: null,
                        consentReloadLoop: false, // FIXME: reloadLoopDetected,
                        consentRule: msg.cmp,
                        consentHeuristicEnabled: heuristicActionEnabled
                    }
                )
                if (msg.cmp === 'HEURISTIC') {
                    this.firePixel('done_heuristic');
                } else {
                    this.firePixel(msg.isCosmetic ? 'done_cosmetic' : 'done');
                }
                cpmState.sitesNotifiedCache.add(senderDomain)
                await this.updateCpmState(cpmState);
                this.requestAddressBarAnimation(tabId, msg.url, msg.isCosmetic);
                this.firePixel(msg.isCosmetic ? 'animation-shown_cosmetic' : 'animation-shown');
                this.notifyPopupHandled(tabId, msg);
                break;
            }
            case 'report': {
                const state = msg.state || {};
                const detectedByPatterns = state.heuristicPatterns?.length > 0;
                const detectedBySnippets = state.heuristicSnippets?.length > 0;
                const detectedPopups = state.detectedPopups?.length > 0;
                const heuristicMatch = detectedByPatterns || detectedBySnippets;
                let updatedCpmState = false;
                if (isMainFrame && heuristicMatch && !cpmState.detectionCache.patterns.has(msg.instanceId)) {
                    cpmState.detectionCache.patterns.add(msg.instanceId);
                    updatedCpmState = true;
                    this.firePixel('detected-by-patterns');
                }
                if (isMainFrame && detectedPopups) {
                    if (heuristicMatch && !cpmState.detectionCache.both.has(msg.instanceId)) {
                        cpmState.detectionCache.both.add(msg.instanceId);
                        updatedCpmState = true;
                        this.firePixel('detected-by-both');
                    } else if (!heuristicMatch && !cpmState.detectionCache.onlyRules.has(msg.instanceId)) {
                        cpmState.detectionCache.onlyRules.add(msg.instanceId);
                        updatedCpmState = true;
                        this.firePixel('detected-only-rules');
                    }
                }
                if (updatedCpmState) {
                    await this.updateCpmState(cpmState);
                }
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
                console.warn(`Unhandled autoconsent message type: ${msg.type}`);
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

    /**
     * send a message to the dashboard to refresh the state
     * @param {number} tabId
     * @param {{
     *  consentManaged: boolean,
     *  cosmetic: boolean?,
     *  optoutFailed: boolean?,
     *  selftestFailed: boolean?,
     *  consentReloadLoop: boolean?,
     *  consentRule: string?,
     *  consentHeuristicEnabled: boolean?
     * }} state
     */
    async refreshDashboardState(tabId, { consentManaged, cosmetic, optoutFailed, selftestFailed, consentReloadLoop, consentRule, consentHeuristicEnabled }) {
        if (BUILD_TARGET === 'embedded') {
            await this.nativeMessaging.notify('refreshCpmDashboardState', {
                tabId,
                consentStatus: {
                    consentManaged,
                    cosmetic,
                    optoutFailed,
                    selftestFailed,
                    consentReloadLoop,
                    consentRule,
                    consentHeuristicEnabled,
                },
            });
        }
    }

    /**
     * @param {number} tabId
     * @param {string} topUrl
     * @param {boolean} isCosmetic
     */
    async requestAddressBarAnimation(tabId, topUrl, isCosmetic) {
        await this.nativeMessaging.notify('showCpmAnimation', {
            tabId,
            topUrl,
            isCosmetic,
        });
    }

    /**
     * @param {number} tabId
     * @param {import('@duckduckgo/autoconsent/lib/messages').DoneMessage} msg
     */
    async notifyPopupHandled(tabId, msg) {
        await this.nativeMessaging.notify('cookiePopupHandled', {
            tabId,
            msg,
        });
    }

    /**
     * @param {string} url
     * @returns {Promise<boolean>}
     */
    async checkAutoconsentEnabledForSite(url) {
        if (BUILD_TARGET === 'embedded') {
            const result = await this.nativeMessaging.request('isFeatureEnabled', {
                featureName: 'autoconsent',
                url,
            });
            return result.status === 'success' && result.data.enabled;
        }
        // FIXME: implement this
        return true;
    }

    /**
     * @param {string} subfeatureName
     * @returns {Promise<boolean>}
     */
    async checkSubfeatureEnabled(subfeatureName) {
        if (BUILD_TARGET === 'embedded') {
            const result = await this.nativeMessaging.request('isSubFeatureEnabled', {
                featureName: 'autoconsent',
                subfeatureName,
            });
            return result.status === 'success' && result.data.enabled;
        }
        // FIXME: implement this
        return true;
    }

    async firePixel(eventName) {
        const cpmState = await this.getCpmState();
        cpmState.summaryEvents[eventName] = (cpmState.summaryEvents[eventName] || 0) + 1;
        await this.updateCpmState(cpmState);

        // schedule summary alarm if not already scheduled (createAlarm checks for existing alarm)
        createAlarm(CookiePromptManagement.SUMMARY_ALARM_NAME, {
            delayInMinutes: CookiePromptManagement.SUMMARY_DELAY_MINUTES,
        });

        // emulate "daily" pixel firing
        const dailyPixelName = `autoconsent_${eventName}_daily`;
        const lastSent = this.settings.getSetting('pixelsLastSent') || {}

        if (lastSent[dailyPixelName] && lastSent[dailyPixelName] > Date.now() - 1000 * 60 * 60 * 24) {
            return;
        }
        lastSent[dailyPixelName] = Date.now();
        this.settings.updateSetting('pixelsLastSent', lastSent);
        sendPixelRequest(dailyPixelName, {
            consentHeuristicEnabled: (await this.checkHeuristicActionEnabled()) ? '1' : '0',
        }, this.nativeMessaging);
    }

    async sendSummaryPixel() {
        const cpmState = await this.getCpmState();
        sendPixelRequest('autoconsent_summary', {
            ...cpmState.summaryEvents,
            consentHeuristicEnabled: (await this.checkHeuristicActionEnabled()) ? '1' : '0',
        }, this.nativeMessaging);
        cpmState.summaryEvents = {};
        // clear the detection cache
        cpmState.detectionCache.patterns.clear();
        cpmState.detectionCache.both.clear();
        cpmState.detectionCache.onlyRules.clear();
        await this.updateCpmState(cpmState);
    }
}
