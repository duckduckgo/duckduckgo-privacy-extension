/** @module smarterEncryption */

const { storeInLookup } = require('./utils')

const SMARTER_ENCRYPTION_PRIORITY = 5000

function generateRegexFilter (subdomainCount, matchWwwSubdomain) {
    return (
        '^http://' +
        (matchWwwSubdomain ? '(www\\.)?' : '') +
        Array(subdomainCount).fill('[^.]+').join('\\.') +
        '(:|/|$)'
    )
}

function generateRule (id, subdomainCount, domains, matchWwwSubdomain) {
    return {
        id,
        priority: SMARTER_ENCRYPTION_PRIORITY,
        action: {
            type: 'upgradeScheme'
        },
        condition: {
            resourceTypes: [
                'main_frame',
                'sub_frame',
                'stylesheet',
                'script',
                'image',
                'font',
                'object',
                'xmlhttprequest',
                'ping',
                'csp_report',
                'media',
                'websocket',
                'webtransport',
                'webbundle',
                'other'
            ],
            requestDomains: domains,
            regexFilter: generateRegexFilter(subdomainCount, matchWwwSubdomain)
        }
    }
}

/**
 * Converts a list of HTTPS enabled domains into a declarativeNetRequest ruleset
 * that upgrades HTTP requests to HTTPS for those domains.
 * @param {string[]} domains
 *   The domains to include in the ruleset.
 *   Note: Subdomains must be explicitly listed, they are not included by
 *         default.
 * @return {Object[]}
 *   The declarativeNetRequest rules.
 */
function generateSmarterEncryptionRuleset (domains, startingRuleId = 1) {
    const domainsBySubdomainCount = new Map()
    const domainsWithOptionalWwwBySubdomainCount = new Map()

    // Separate domains with the www. prefix. Many domains are listed both with
    // and without the www subdomain, so it makes sense to combine those entries
    // in the ruleset.
    const domainsToMatchWithWwwPrefix = new Set()
    const nonWwwDomains = []
    for (const domain of domains) {
        if (domain.startsWith('www.')) {
            domainsToMatchWithWwwPrefix.add(domain.substr(4))
        } else {
            nonWwwDomains.push(domain)
        }
    }

    // Group the domains by subdomain count. Necessary since requestDomains
    // rule conditions also include all subdomains by default, but that isn't
    // desired here. Each rule has only domains with the same number of
    // subdomains, and a regexFilter is added to prevent matching request
    // domains with a different number of subdomains.
    for (const domain of nonWwwDomains) {
        if (domainsToMatchWithWwwPrefix.has(domain)) {
            domainsToMatchWithWwwPrefix.delete(domain)
            storeInLookup(
                domainsWithOptionalWwwBySubdomainCount,
                domain.split('.').length,
                [domain]
            )
        } else {
            storeInLookup(
                domainsBySubdomainCount,
                domain.split('.').length,
                [domain]
            )
        }
    }

    // Add any remaining domains with the www. prefix that aren't also seen
    // without the prefix.
    // Note: Arguably these should be matched with or without the www subdomain
    //       too, but that behavior wouldn't be consistent with the
    //       Smarter Encryption feature on other platforms. Doing that
    //       carelessly would also cause problems for edge-cases such as for
    //       the domain "www.pl" - matching the entire "pl" TLD would be a
    //       mistake!
    for (const domain of domainsToMatchWithWwwPrefix) {
        storeInLookup(
            domainsBySubdomainCount,
            domain.split('.').length + 1,
            ['www.' + domain]
        )
    }

    // Generate the rules.
    let id = startingRuleId
    const rules = []

    for (const [subdomainCount, domainGroup] of domainsBySubdomainCount) {
        if (domainGroup.length < 1) {
            continue
        }
        rules.push(generateRule(id++, subdomainCount, domainGroup, false))
    }
    for (const [subdomainCount, domainGroup] of
        domainsWithOptionalWwwBySubdomainCount) {
        if (domainGroup.length < 1) {
            continue
        }
        rules.push(generateRule(id++, subdomainCount, domainGroup, true))
    }

    return rules
}

/**
 * Create a rule to disable or enable automatic HTTPS upgrades for a set of domains.
 *  - if type is 'allow' this will be an exception rule, preventing upgrades for the given domains.
 *  - if type is 'upgrade' this will be an upgradeScheme rule, causing requests for that domain to be upgraded to HTTPs.
 * @param {string[]} domains
 * @param {'allow' | 'upgrade'} type 'allow' to create an allowlist rule, 'upgrade' to create an upgrade rule
 * @param {number} [id] (optional) rule ID
 * @returns {{
 *  rule: import('./utils.js').DNRRule;
 *  matchDetails: {
 *      type: string;
 *      possibleTrackerDomains?: string[];
 *  };
 *  }}
 */
function createSmarterEncryptionTemporaryRule (domains, type = 'allow', id) {
    if (['allow', 'upgrade'].indexOf(type) === -1) {
        // invalid type
        throw new Error(`createSmarterEncryptionTemporaryRule type ${type} is not valid`)
    }
    const actionType = type === 'allow' ? 'allow' : 'upgradeScheme'
    const detailsType = type === 'allow' ? 'httpsAllowlist' : 'sessionUpgrades'
    return {
        rule: {
            id,
            priority: SMARTER_ENCRYPTION_PRIORITY,
            action: {
                type: actionType
            },
            condition: {
                requestDomains: domains,
                resourceTypes: [
                    'main_frame',
                    'sub_frame',
                    'stylesheet',
                    'script',
                    'image',
                    'font',
                    'object',
                    'xmlhttprequest',
                    'ping',
                    'csp_report',
                    'media',
                    'websocket',
                    'webtransport',
                    'webbundle',
                    'other'
                ]
            }
        },
        matchDetails: {
            type: detailsType,
            possibleTrackerDomains: domains
        }
    }
}

exports.SMARTER_ENCRYPTION_PRIORITY = SMARTER_ENCRYPTION_PRIORITY
exports.generateSmarterEncryptionRuleset = generateSmarterEncryptionRuleset
exports.createSmarterEncryptionTemporaryRule = createSmarterEncryptionTemporaryRule
