import { ALTERNATIVE_SEARCH_RULE_ID } from '../dnr-utils';
import { ALTERNATIVE_SEARCH_PRIORITY } from '@duckduckgo/ddg2dnr/lib/rulePriorities';
import { generateDNRRule } from '@duckduckgo/ddg2dnr/lib/utils';

const browserWrapper = require('../wrapper');

export const ALTERNATIVE_SEARCH_SUBDOMAINS = ['noai', 'safe'];

const manifestVersion = browserWrapper.getManifestVersion();

/**
 * Apply the alternative search redirect to a URL object in-place.
 * Used by before-request.js on MV2 to compose with ATB param injection
 * in a single synchronous redirect.
 * @param {URL} url
 * @param {string} subdomain
 * @returns {boolean} true if the URL was modified.
 */
export function applySearchChoice(url, subdomain) {
    if (!ALTERNATIVE_SEARCH_SUBDOMAINS.includes(subdomain)) {
        return false;
    }
    const isSerp = url.hostname === 'duckduckgo.com' && url.pathname === '/' && url.searchParams.has('q');
    const isStartPage = url.hostname === 'start.duckduckgo.com';
    if (isSerp || isStartPage) {
        url.hostname = `${subdomain}.duckduckgo.com`;
        return true;
    }
    return false;
}

export default class SearchChoice {
    /**
     * @param {{
     *  settings: import('../settings.js');
     * }} options
     */
    constructor({ settings }) {
        this.settings = settings;

        if (manifestVersion === 3) {
            this.updateDNRRule();
            settings.onSettingUpdate.addEventListener('alternativeSearch', () => this.updateDNRRule());
            settings.onSettingUpdate.addEventListener('atb', () => this.updateDNRRule());
        }
    }

    /**
     * On MV3, create a combined DNR redirect rule that handles both
     * the alternative search hostname rewrite and ATB param injection.
     *
     * Chrome's DNR only applies one redirect rule per request, so these
     * must be combined into a single rule to avoid a race where ATB's
     * standalone rule wins and the hostname redirect never fires.
     *
     * When alternativeSearch is disabled, this rule is removed and ATB's
     * standalone rule handles ATB param injection by itself.
     */
    updateDNRRule() {
        if (manifestVersion !== 3) {
            return;
        }

        const subdomain = this.settings.getSetting('alternativeSearch') || '';
        if (!ALTERNATIVE_SEARCH_SUBDOMAINS.includes(subdomain)) {
            chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [ALTERNATIVE_SEARCH_RULE_ID],
            });
            return;
        }

        const atb = this.settings.getSetting('atb');
        const addOrReplaceParams = atb ? [{ key: 'atb', value: atb }] : [];

        const rule = generateDNRRule({
            id: ALTERNATIVE_SEARCH_RULE_ID,
            priority: ALTERNATIVE_SEARCH_PRIORITY,
            actionType: 'redirect',
            redirect: {
                transform: {
                    host: `${subdomain}.duckduckgo.com`,
                    queryTransform: { addOrReplaceParams },
                },
            },
            resourceTypes: ['main_frame'],
            requestDomains: ['duckduckgo.com', 'start.duckduckgo.com'],
            regexFilter: '^https?://(duckduckgo\\.com/\\?([^&]*&)*q=|start\\.duckduckgo\\.com/)',
        });

        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [ALTERNATIVE_SEARCH_RULE_ID],
            addRules: [rule],
        });
    }
}
