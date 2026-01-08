import { filterCompactRules, snippets } from '@duckduckgo/autoconsent';
import { registerMessageHandler } from '../message-handlers';
import { registerContentScripts } from './mv3-content-script-injection';
import { sendPixelRequest } from '../pixels';

/**
 * @typedef {import('../tab-manager.js')} TabManager
 */
export default class CookiePromptManagement {
    /**
     *
     * @param {{
     *  settings: import('../settings')
     *  remoteConfig: import('./remote-config').default
     *  tabManager: TabManager;
     * }} param0
     */
    constructor({ settings, remoteConfig, tabManager }) {
        this.settings = settings;
        this.remoteConfig = remoteConfig;
        this.tabManager = tabManager;
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
        registerMessageHandler('autoconsent', this.handleAutoConsentMessage.bind(this));
    }


    async handleAutoConsentMessage(options, sender, msg) {
        const tabId = sender.tab.id;
        const frameId = sender.frameId;
        const isMainFrame = frameId === 0;
        const senderUrl = sender.url || `${sender.origin}/`;
        const tab = await this.tabManager.getOrRestoreTab(tabId);
        const autoconsentSettings = this.remoteConfig.config?.features.autoconsent?.settings;

        if (!autoconsentSettings || !autoconsentSettings.compactRuleList || !tab) {
            return;
        }
        const isEnabled = tab.site.isFeatureEnabled('autoconsent');
        if (!isEnabled) {
            this.firePixel('disabled-for-site');
        }
        /**
         * @type {Partial<import('@duckduckgo/autoconsent/lib/types').Config>}
         */
        const config = {
            enabled: isEnabled,
            autoAction: 'optOut',
            disabledCmps: autoconsentSettings.disabledCMPs || [],
            enablePrehide: true,
            enableCosmeticRules: true,
            enableGeneratedRules: true,
            enableFilterList: false,
            enableHeuristicDetection: true,
            visualTest: false,
            logs: {
                lifecycle: false,
                detectionsteps: false,
                errors: false,
                evals: false,
                messages: false,
                rulesteps: false,
                waits: false,
            },
        };

        switch (msg.type) {
            case 'init': {
                const rules = {
                    autoconsent: [],
                    consentomatic: [],
                    compact:
                        autoconsentSettings.compactRuleList.index !== undefined
                            ? filterCompactRules(autoconsentSettings.compactRuleList, { url: senderUrl, mainFrame: isMainFrame })
                            : autoconsentSettings.compactRuleList,
                };
                if (isMainFrame) {
                    this.firePixel('init')
                }
                return {
                    type: 'initResp',
                    rules,
                    config,
                }
            }
            case 'cmpDetected': { }
            case 'popupFound': {
                this.firePixel('popup-found');
                break;
            }
            case 'optOutResult': {
                if (!msg.result) {
                    this.firePixel('error_optout');
                }
                break;
            }
            case 'autoconsentDone': {
                this.firePixel(msg.isCosmetic ? 'done_cosmetic' : 'done');
                break;
            }
            case 'report': {
                console.log('report', msg);
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
                const [result] = await chrome.scripting.executeScript({
                    target: {
                        tabId,
                        frameIds: [frameId],
                    },
                    world: 'MAIN',
                    func: snippets[msg.snippetId],
                })
                return {
                    id: msg.id,
                    type: 'evalResp',
                    result: result.result,
                }
            }
            case 'autoconsentError': {
                this.firePixel('error_multiple-popups');
                break;
            }
            default:
                console.warn(`Unhandled autoconsent message type: ${msg.type}`);
                break;
        }
    }

    firePixel(eventName) {
        const pixel = `autoconsent_${eventName}_daily`;
        const lastSent = this.settings.getSetting('pixelsLastSent') || {}
        this.summaryEvents[eventName] = (this.summaryEvents[eventName] || 0) + 1;
        // check if the summary timer is active
        if (!this.summaryTimer) {
            this.summaryTimer = setTimeout(() => {
                this.summaryTimer = null;
                sendPixelRequest('autoconsent_summary', this.summaryEvents);
                this.summaryEvents = {};
                // clear the detection cache
                this.detectionCache.patterns.clear();
                this.detectionCache.both.clear();
                this.detectionCache.onlyRules.clear();
            }, 20_000);
        }
        if (lastSent[pixel] && lastSent[pixel] > Date.now() - 1000 * 60 * 60 * 24) {
            return;
        }
        lastSent[pixel] = Date.now();
        this.settings.updateSetting('pixelsLastSent', lastSent);
        sendPixelRequest(pixel);
    }
}
