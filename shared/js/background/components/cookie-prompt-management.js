import { filterCompactRules } from '@duckduckgo/autoconsent/lib/encoding';
import { snippets } from '@duckduckgo/autoconsent/lib/eval-snippets';
import { registerMessageHandler } from '../message-handlers';
import { registerContentScripts } from './mv3-content-script-injection';

export default class CookiePromptManagement {
    /**
     *
     * @param {{remoteConfig: import('./remote-config').default}} param0
     */
    constructor({ remoteConfig }) {
        this.remoteConfig = remoteConfig;

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
        const senderUrl = sender.url || `${sender.origin}/`;
        const senderDomain = new URL(senderUrl).hostname;
        const autoconsentSettings = this.remoteConfig.config?.features.autoconsent?.settings;

        if (!autoconsentSettings || !autoconsentSettings.compactRuleList) {
            return;
        }

        /**
         * @type {Partial<import('@duckduckgo/autoconsent/lib/types').Config>}
         */
        const config = {
            enabled: this.remoteConfig.isFeatureEnabled('autoconsent'),
            autoAction: 'optOut',
            disabledCmps: autoconsentSettings.disabledCMPs || [],
            enablePrehide: true,
            enableCosmeticRules: true,
            enableGeneratedRules: true,
            enableFilterList: false,
            enableHeuristicDetection: true,
            visualTest: true,
            logs: {
                lifecycle: true,
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
                            ? filterCompactRules(autoconsentSettings.compactRuleList, { url: senderUrl, mainFrame: sender.frameId === 0 })
                            : autoconsentSettings.compactRuleList,
                };
                console.log('initresp', config, rules);
                return {
                    type: 'initResp',
                    rules,
                    config,
                }
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
            default:
                console.warn(`Unhandled autoconsent message type: ${msg.type}`);
                break;
        }
    }
}
