import { filterCompactRules, evalSnippets } from '@duckduckgo/autoconsent';
import { registerContentScripts } from './mv3-content-script-injection';
import { sendPixelRequest } from '../pixels';
import defaultCompactRuleList from '@duckduckgo/autoconsent/rules/compact-rules.json';

/**
 * @typedef {import('../tab-manager.js')} TabManager
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
     *  remoteConfig: import('./remote-config').default
     * }} opts
     */
    constructor({ remoteConfig }) {
        this.remoteConfig = remoteConfig;
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

        // Embedded builds don't use MessageRouter, so we need to set up a direct message listener
        if (BUILD_TARGET === 'embedded') {
            chrome.runtime.onMessage.addListener((req, sender) => {
                if (req.messageType === 'autoconsent') {
                    this.handleAutoConsentMessage(req.autoconsentPayload, sender);
                }
                return true;
            });
        }
    }

    async handleAutoConsentMessage(msg, sender) {
        const tabId = sender.tab.id;
        const frameId = sender.frameId;
        const isMainFrame = frameId === 0;
        const senderUrl = sender.url || `${sender.origin}/`;
        const autoconsentRemoteConfig = this.remoteConfig.config?.features.autoconsent;
        const autoconsentSettings = autoconsentRemoteConfig?.settings;
        console.log('received autoconsent message', msg.type, msg, 'sender:', sender, 'autoconsentRemoteConfig:', autoconsentRemoteConfig, 'defaultCompactRuleList:', defaultCompactRuleList);

        if (!autoconsentSettings || !tabId) {
            return;
        }
        // TODO: get this state from native
        // const isEnabled = tab.site.isFeatureEnabled('autoconsent');
        const isEnabled = true;
        if (!isEnabled) {
            this.firePixel('disabled-for-site');
        }

        // TODO: get this state from native
        const heuristicActionEnabled = true;
        const visualTest = DEBUG;

        /**
         * @type {Partial<import('@duckduckgo/autoconsent/lib/types').Config>}
         */
        const config = {
            enabled: isEnabled,
            autoAction: 'optOut',
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

        switch (msg.type) {
            case 'init': {
                const compactRuleList = autoconsentRemoteConfig?.compactRuleList || defaultCompactRuleList;
                const rules = {
                    autoconsent: [],
                    consentomatic: [],
                    compact:
                        compactRuleList.index !== undefined
                            ? filterCompactRules(compactRuleList, { url: senderUrl, mainFrame: isMainFrame })
                            : compactRuleList,
                };
                if (isMainFrame) {
                    this.firePixel('init')
                }
                chrome.tabs.sendMessage(
                    tabId,
                    {
                        type: 'initResp',
                        rules,
                        config,
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
                break;
            }
            case 'optOutResult': {
                if (!msg.result) {
                    this.firePixel('error_optout');
                } else {
                    // TODO: implement self-tests
                }
                break;
            }
            case 'autoconsentDone': {
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

    firePixel(eventName) {
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
