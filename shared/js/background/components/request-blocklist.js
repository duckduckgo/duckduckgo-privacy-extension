import { getBaseDomain, isFeatureEnabled } from '../utils';
import tdsStorage from '../storage/tds';
import { getHostname } from 'tldts';
import { validRule } from '@duckduckgo/ddg2dnr/lib/requestBlocklist';
import { IS_BLOCKING_WEBREQUEST_AVAILABLE } from '../environment';

const browserWrapper = require('../wrapper');

// Note: Since this lookup (and the whole component) is only used by MV2 builds
//       of the extension, it being cleared on ServiceWorker restart isn't a
//       concern.
//       See https://developer.chrome.com/docs/extensions/mv3/migrating_to_service_workers/#state
let requestBlocklistLookup = null;

/**
 * Convert a Request Blocklist rule (literal string, but with basic wildcard
 * support) to a regular expression.
 * Note: Once browser support catches up, it would be nice to use RegExp.Escape
 *       here instead of the manual escaping.
 * @param {string} requestBlocklistRule
 * @returns {RegExp}
 */
function parseRule(requestBlocklistRule) {
    return new RegExp(requestBlocklistRule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*'));
}

/**
 * @typedef {import('@duckduckgo/privacy-configuration/schema/config.ts').CurrentGenericConfig} Config
 */

/**
 * Update requestBlocklist lookup, based on the given configuration.
 *
 * @param {import('@duckduckgo/privacy-configuration/schema/config.ts').CurrentGenericConfig} config
 */
function updateRequestBlocklistLookup(config) {
    const configRules = tdsStorage?.config?.features?.requestBlocklist?.settings?.blockedRequests;
    if (!configRules || !isFeatureEnabled('requestBlocklist', config)) {
        requestBlocklistLookup = null;
        return;
    }

    const newLookup = new Map();
    for (const [domain, entry] of Object.entries(configRules)) {
        if (entry?.rules?.length) {
            newLookup.set(
                domain,
                entry.rules.filter(validRule).map((rule) => ({
                    rule: parseRule(rule.rule),
                    domains: new Set(rule.domains),
                    reason: rule.reason,
                })),
            );
        }
    }

    requestBlocklistLookup = newLookup;
}

/**
 * Component for the RequestBlocklist feature, which allows for requests to be
 * blocked in order to fix website breakage issues.
 *
 * TODO: Once RequestBlocklist.matchRequest() is called from another
 *       component, make matchRequest() (and the dependendant methods) instance
 *       methods. Also, then pass the tdsStorage etc modules into the
 *       constructor via dependency injection, instead of importing them, to aid
 *       unit testing.
 */
export default class RequestBlocklist {
    static featureName = 'requestBlocklist';

    constructor() {
        if (IS_BLOCKING_WEBREQUEST_AVAILABLE) {
            tdsStorage.onUpdate('config', (name, etag, config) => {
                updateRequestBlocklistLookup(config);
            });

            updateRequestBlocklistLookup(tdsStorage?.config);
        }
    }

    static matchRequest(siteUrl, requestUrl, requestType) {
        // Lookup isn't ready, don't block.
        if (!requestBlocklistLookup) {
            return false;
        }

        // Main-frame requests (aka navigations) shouldn't be blocked.
        if (requestType === 'main_frame') {
            return false;
        }

        // Find entry in blocklist that matches request URL by eTLD+1.
        const requestDomain = getBaseDomain(requestUrl);
        if (!requestDomain) {
            return false;
        }
        const rules = requestBlocklistLookup.get(requestDomain);
        if (!rules?.length) {
            return false;
        }

        // Normalise the URL (e.g. strip port part if redundant).
        // TODO: Consider if this can be removed in practice, by verifying if
        //       request URL provided by webRequest etc APIs is always already
        //       normalised correctly.
        requestUrl = new URL(requestUrl).href;

        // See if any of the rules for the blocklist entry are a match.
        for (const rule of rules) {
            // First, check rule matches request URL.
            if (!rule.rule.test(requestUrl)) {
                continue;
            }

            // Next, check domain condition matches website URL.
            if (rule.domains.has('<all>')) {
                return rule;
            }
            const websiteDomain = getHostname(siteUrl);
            if (!websiteDomain) {
                continue;
            }
            for (let i = -1; i !== 0; i = websiteDomain.indexOf('.', i) + 1) {
                if (rule.domains.has(websiteDomain.substring(i))) {
                    return rule;
                }
            }
        }

        return false;
    }
}
