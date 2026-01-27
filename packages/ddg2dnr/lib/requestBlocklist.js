/** @module requestBlocklist */

const { getDomain } = require('tldts');

const { processPlaintextTrackerRule, generateDNRRule } = require('./utils');

const EXPECTED_RULE_KEYS = new Set(['domains', 'rule' /* , 'reason' */]);
const PRIORITY = 20000;

function validRule(rule) {
    // Missing or unknown rule properties.
    // Note: Ignore "reason", since that is optional.
    const ruleKeys = Object.keys(rule).filter((key) => key !== 'reason');
    if (ruleKeys.length !== EXPECTED_RULE_KEYS.size || !ruleKeys.every((key) => EXPECTED_RULE_KEYS.has(key))) {
        return false;
    }

    // Reject rules using adblock filter syntax.
    // Note: This isn't perfect since escaping isn't supported, but it's
    //       hopefully good enough to discourage filter syntax use
    //       without being too restrictive.
    if (rule?.rule?.startsWith('|') || rule?.rule?.includes('^')) {
        return false;
    }

    return true;
}

/**
 * @typedef generateRequestBlocklistRulesResult
 * @property {Omit<chrome.declarativeNetRequest.Rule, 'id'>} rule
 * @property {object} matchDetails
 */

/**
 * Generator to produce the declarativeNetRequest rules and corresponding match
 * details for the given requestBlocklist configuration.
 * @param {object} extensionConfiguration
 *   The extension configuration.
 * @returns {Generator<generateRequestBlocklistRulesResult>}
 */
function* generateRequestBlocklistRules({ features: { requestBlocklist } }) {
    const entries = requestBlocklist?.settings?.blockedRequests;
    const domainExceptions = requestBlocklist?.exceptions?.map((e) => e.domain);

    if (requestBlocklist?.state !== 'enabled' || !entries) {
        return;
    }

    for (const [trackerDomain, entry] of Object.entries(entries)) {
        const { rules } = entry;
        if (!rules?.length) {
            continue;
        }

        // Entries must use eTLD+1.
        if (getDomain(trackerDomain) !== trackerDomain) {
            console.log('Request Blocklist entry for non-eTLD+1 domain', trackerDomain, 'ignored.');
            continue;
        }

        for (const rule of rules) {
            if (!validRule(rule)) {
                continue;
            }

            let { rule: trackerRule, domains: initiatorDomains, reason } = rule;
            const { urlFilter } = processPlaintextTrackerRule(trackerDomain, trackerRule);

            if (!initiatorDomains?.length || initiatorDomains.includes('<all>')) {
                initiatorDomains = null;
            }

            yield {
                rule: generateDNRRule({
                    priority: PRIORITY,
                    actionType: 'block',
                    urlFilter,
                    matchCase: true,
                    requestDomains: [trackerDomain],
                    initiatorDomains,
                    excludedInitiatorDomains: domainExceptions,
                    excludedRequestDomains: domainExceptions,
                }),
                matchDetails: {
                    type: 'requestBlocklist',
                    domain: trackerDomain,
                    reason,
                },
            };
        }
    }
}

exports.PRIORITY = PRIORITY;

exports.validRule = validRule;
exports.generateRequestBlocklistRules = generateRequestBlocklistRules;
