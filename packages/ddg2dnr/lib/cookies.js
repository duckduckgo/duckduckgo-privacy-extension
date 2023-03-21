const { generateRequestDomainsByTrackerDomain, getTrackerEntryDomain, storeInLookup } = require('./utils')

const COOKIE_PRIORITY = 40000

/**
 * Build HTTP cookie blocking rules from the blocklist and cookie configuration
 * @param {import('./utils').TDS} tds The tracker blocklist
 * @param {string[]} excludedCookieDomains 3p domains for which we shouldn't block cookies
 * @param {string[]} siteAllowlist Sites on which we shouldn't block 3p cookies
 * @returns {import('./utils').RulesetResult} Cookie blocking rules
 */
function generateCookieBlockingRuleset (tds, excludedCookieDomains, siteAllowlist, startingRuleId = 1) {
    /** @type {import('./utils').DNRRule[]} */
    const rules = []
    /** @type {Map<string, { domains: Set<string>, trackerDomains: Set<string> }>} */
    const entityDomainMapping = new Map()
    /** @type {Map<string, string[]>} */
    const trackerDomainExclusions = new Map()
    /** @type {import('./utils').MatchDetailsByRuleId} */
    const matchDetailsByRuleId = {}
    /**
     * @type {string[]} tracker domains that are part of entities which only have a single domain
     * associated with them. These domains have a simplified same entity rule, which we can
     * implement with the `domainType: thirdParty` rule condition. This allows us to collapse
     * all these domains into a single rule.
     */
    const singleDomainEntityDomains = []
    // collect CNAMEs for each tracker
    const requestDomainsByTrackerDomain = generateRequestDomainsByTrackerDomain(tds)

    // process exclusions: Find the tracker domain associated with each excluded cookie domain,
    // so that the correct exclusions can be added with each declarativeNetRequest rule.
    for (const domain of excludedCookieDomains) {
        const trackerEntryDomain = getTrackerEntryDomain(tds.trackers, domain)
        storeInLookup(trackerDomainExclusions, trackerEntryDomain, [domain])
    }

    // Gather trackers by owner and build the set of owned and owned tracker domains for each
    for (const [trackerDomain, trackerEntry] of Object.entries(tds.trackers)) {
        const mapEntry = entityDomainMapping.get(trackerEntry.owner.name) || { domains: new Set(), trackerDomains: new Set() }

        for (const domain of requestDomainsByTrackerDomain.get(trackerDomain) || []) {
            mapEntry.domains.add(domain)
            mapEntry.trackerDomains.add(domain)
        }
        tds.entities[trackerEntry.owner.name].domains.forEach(d => mapEntry.domains.add(d))

        entityDomainMapping.set(trackerEntry.owner.name, mapEntry)
    }

    for (const [, { domains, trackerDomains }] of entityDomainMapping.entries()) {
        // find if domains are excluded for this entity
        const excludedRequestDomains = []
        for (const domain of trackerDomains) {
            if (trackerDomainExclusions.has(domain)) {
                excludedRequestDomains.push(...trackerDomainExclusions.get(domain) || [])
            }
        }
        // If this is a single tracker domain entity, put it to the side. We'll generate a single
        // DNR rule for all of these (see description of `singleDomainEntityDomains` for more)
        if (domains.size === 1 && trackerDomains.size === 1 && excludedRequestDomains.length === 0) {
            singleDomainEntityDomains.push(...domains)
            continue
        }
        rules.push({
            id: startingRuleId++,
            priority: COOKIE_PRIORITY,
            action: {
                type: 'modifyHeaders',
                requestHeaders: [{ header: 'cookie', operation: 'remove' }],
                responseHeaders: [{ header: 'set-cookie', operation: 'remove' }]
            },
            condition: {
                requestDomains: Array.from(trackerDomains),
                excludedInitiatorDomains: [...domains, ...siteAllowlist],
                excludedRequestDomains
            }
        })
        matchDetailsByRuleId[startingRuleId] = {
            type: 'cookieBlocking',
            possibleTrackerDomains: Array.from(trackerDomains)
        }
    }
    // create a single rule for all domains which only have 1 domain
    if (singleDomainEntityDomains.length > 0) {
        rules.push({
            id: ++startingRuleId,
            priority: COOKIE_PRIORITY,
            action: {
                type: 'modifyHeaders',
                requestHeaders: [{ header: 'cookie', operation: 'remove' }],
                responseHeaders: [{ header: 'set-cookie', operation: 'remove' }]
            },
            condition: {
                requestDomains: singleDomainEntityDomains,
                excludedInitiatorDomains: siteAllowlist,
                domainType: 'thirdParty'
            }
        })
        matchDetailsByRuleId[startingRuleId] = {
            type: 'cookieBlocking',
            possibleTrackerDomains: singleDomainEntityDomains
        }
    }

    return {
        ruleset: rules,
        matchDetailsByRuleId
    }
}

exports.generateCookieBlockingRuleset = generateCookieBlockingRuleset
exports.COOKIE_PRIORITY = COOKIE_PRIORITY
