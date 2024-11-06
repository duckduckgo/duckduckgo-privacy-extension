import { createSmarterEncryptionTemporaryRule } from '@duckduckgo/ddg2dnr/lib/smarterEncryption';

import { findExistingSessionRule, HTTPS_SESSION_ALLOWLIST_RULE_ID, HTTPS_SESSION_UPGRADE_RULE_ID } from './dnr-utils';

/**
 * Update a Smarter Encryption session rule, adding the given domain to the list of domains in the condition.
 * @param {number} ruleId Session rule ID
 * @param {string} addDomain Domain to add to this rule's requestDomains condition.
 * @param {'allow' | 'upgrade'} type If the rule should be an allow or upgrade rule.
 */
async function updateSmarterEncryptionSessionRule(ruleId, addDomain, type) {
    const existingRule = await findExistingSessionRule(ruleId);
    const ruleDomains = existingRule?.condition.requestDomains || [];
    if (ruleDomains.includes(addDomain)) {
        return;
    }
    ruleDomains.push(addDomain);
    const { rule } = createSmarterEncryptionTemporaryRule(ruleDomains, type, ruleId);
    await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [ruleId],
        addRules: [rule],
    });
}

export async function addSmarterEncryptionSessionException(domain) {
    return updateSmarterEncryptionSessionRule(HTTPS_SESSION_ALLOWLIST_RULE_ID, domain, 'allow');
}

export async function addSmarterEncryptionSessionRule(domain) {
    return updateSmarterEncryptionSessionRule(HTTPS_SESSION_UPGRADE_RULE_ID, domain, 'upgrade');
}
