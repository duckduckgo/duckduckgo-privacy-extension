import { filterCompactRules, evalSnippets } from '@duckduckgo/autoconsent';
import { registerContentScripts } from './mv3-content-script-injection';
import { sendPixelRequest } from '../pixels';
import { getFromSessionStorage, setToSessionStorage } from '../wrapper';
import defaultCompactRuleList from '@duckduckgo/autoconsent/rules/compact-rules.json';

/**
 * @typedef {import('../tab-manager.js')} TabManager
 */

/**
 * @typedef {Object} CpmState
 * @property {Record<number, {
 *  lastHandledCMPName: string | null,
 *  reloadLoopDetected: boolean,
 * }} tabState
 * @property {string[]} sitesNotifiedCache
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
        this.summaryEvents = {};
        this.summaryTimer = null;
        this.detectionCache = {
            patterns: new Set(),
            both: new Set(),
            onlyRules: new Set(),
        };

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
        this.getCpmState().then((cpmState) => {
            this._cpmState = cpmState;
        });

        // Embedded builds don't use MessageRouter, so we need to set up a direct message listener
        if (BUILD_TARGET === 'embedded') {
            chrome.runtime.onMessage.addListener(async (req, sender) => {
                if (req.messageType === 'autoconsent') {
                    return this.handleAutoConsentMessage(req.autoconsentPayload, sender);
                }
            });
        }
    }

    /**
     * @returns {Promise<CpmState>}
     */
    async getCpmState() {
        if (this._cpmState) return this._cpmState;
        this._cpmState = await getFromSessionStorage('cpmState').then((cpmState) => {
            return cpmState || {
                tabState: {},
                sitesNotifiedCache: [],
            };
        });
        return this._cpmState;
    }

    /**
     * @param {CpmState} newState
     */
    async updateCpmState(newState) {
        this._cpmState = newState;
        await setToSessionStorage('cpmState', this._cpmState);
    }

    /**
     *
     * @param {import('@duckduckgo/autoconsent/lib/messages').ContentScriptMessage} msg
     * @param {chrome.runtime.MessageSender} sender
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
        const heuristicActionEnabled = await this.checkSubfeatureEnabled('heuristicAction');
        const cpmState = await this.getCpmState();
        const sitesNotifiedSet = new Set(cpmState.sitesNotifiedCache);

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
                            consentManaged: sitesNotifiedSet.has(senderDomain),
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
                        autoconsentConfig,
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
                sitesNotifiedSet.add(senderDomain)
                await this.updateCpmState({
                    ...cpmState,
                    sitesNotifiedCache: Array.from(sitesNotifiedSet),
                });
                this.requestAddressBarAnimation(tabId, msg.url, msg.isCosmetic);
                this.notifyPopupHandled(tabId, msg);

                if (msg.cmp === 'HEURISTIC') {
                    this.firePixel('done_heuristic');
                } else {
                    this.firePixel(msg.isCosmetic ? 'done_cosmetic' : 'done');
                }
                break;
            }
            case 'report': {
                // TODO: verify this logic
                const state = msg.state || {};
                const detectedByPatterns = state.heuristicPatterns?.length > 0;
                const detectedBySnippets = state.heuristicSnippets?.length > 0;
                const detectedPopups = state.detectedPopups?.length > 0;
                const heuristicMatch = detectedByPatterns || detectedBySnippets;
                if (isMainFrame && heuristicMatch && !this.detectionCache.patterns.has(msg.instanceId)) {
                    this.detectionCache.patterns.add(msg.instanceId);
                    this.firePixel('detected-by-patterns');
                }
                if (isMainFrame && detectedPopups) {
                    if (heuristicMatch && !this.detectionCache.both.has(msg.instanceId)) {
                        this.detectionCache.both.add(msg.instanceId);
                        this.firePixel('detected-by-both');
                    } else if (!heuristicMatch && !this.detectionCache.onlyRules.has(msg.instanceId)) {
                        this.detectionCache.onlyRules.add(msg.instanceId);
                        this.firePixel('detected-only-rules');
                    }
                }
                break;
            }
            case 'eval': {
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
                break;
            }
            case 'autoconsentError': {
                // FIXME: validate the error type
                this.firePixel('error_multiple-popups');
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
     * @returns
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
     * @param {import('@duckduckgo/autoconsent/lib/messages').AutoconsentDoneMessage} msg
     */
    async notifyPopupHandled(tabId, msg) {
        await this.nativeMessaging.notify('cookiePopupHandled', {
            tabId,
            msg,
        });
    }

    async checkAutoconsentEnabledForSite(url) {
        // FIXME: implement this
        return true;
    }

    async checkSubfeatureEnabled(subfeatureName) {
        // FIXME: implement this
        return true;
    }

    async firePixel(eventName) {
        const pixel = `autoconsent_${eventName}_daily`;
        // TODO: send this via native
        // const lastSent = this.settings.getSetting('pixelsLastSent') || {}
        // this.summaryEvents[eventName] = (this.summaryEvents[eventName] || 0) + 1;
        // check if the summary timer is active
        // if (!this.summaryTimer) {
        //     this.summaryTimer = setTimeout(() => {
        //         this.summaryTimer = null;
        //         sendPixelRequest('autoconsent_summary', this.summaryEvents);
        //         this.summaryEvents = {};
        //         // clear the detection cache
        //         this.detectionCache.patterns.clear();
        //         this.detectionCache.both.clear();
        //         this.detectionCache.onlyRules.clear();
        //     }, 20_000);
        // }
        // if (lastSent[pixel] && lastSent[pixel] > Date.now() - 1000 * 60 * 60 * 24) {
        //     return;
        // }
        // lastSent[pixel] = Date.now();
        // this.settings.updateSetting('pixelsLastSent', lastSent);
        sendPixelRequest(pixel);
    }
}
