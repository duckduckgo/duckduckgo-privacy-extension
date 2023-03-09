
function convertDnrRule (accumulator, rule) {
    let { ruleset, nextId } = accumulator
    if (rule.action.type === 'allowAllRequests') {
        // fix for allowAllRequests
        for (const domain of rule.condition.requestDomains) {
            ruleset.push({
                id: nextId++,
                action: {
                    type: 'allowAllRequests'
                },
                condition: {
                    urlFilter: `https://${domain}/*`,
                    resourceTypes: rule.condition.resourceTypes
                }
            })
        }
        return { ruleset, nextId }
    }
    if (rule.action.type === 'redirect' && rule.condition.urlFilter?.startsWith('||')) {
        rule.condition.urlFilter = rule.condition.urlFilter.slice(2)
    }
    if (rule.condition.excludedInitiatorDomains) {
        // subdomain matching prefix
        rule.condition.excludedDomains = rule.condition.excludedInitiatorDomains.map(d => `*${d}`)
        delete rule.condition.excludedInitiatorDomains
    }
    if (rule.condition.initiatorDomains) {
        if (!rule.condition.initiatorDomains.includes('<all_urls>')) {
            // subdomain matching prefix
            rule.condition.domains = rule.condition.initiatorDomains.map(d => `*${d}`)
        }
        delete rule.condition.initiatorDomains
    }
    if (rule.condition.regexFilter) {
        // this only happens for facebook rules, for which it's safe to drop the requestDomains part
        delete rule.condition.requestDomains
    }
    if (rule.condition.requestDomains) {
        for (const domain of rule.condition.requestDomains) {
            const urlFilter = rule.condition.urlFilter || `||${domain}/`
            if (rule.condition.urlFilter && !rule.condition.urlFilter.includes(domain)) {
                // console.warn(`skip requestDomain ${domain} with filter ${rule.condition.urlFilter} (no-op rule)`)
                continue
            }
            const ruleCopy = JSON.parse(JSON.stringify(rule))
            delete ruleCopy.condition.requestDomains
            ruleCopy.condition.urlFilter = urlFilter
            ruleCopy.id = nextId++
            ruleset.push(ruleCopy)
        }
    } else {
        rule.id = nextId++
        ruleset.push(rule)
    }
    return { ruleset, nextId }
}

export function convertDNRRuleset (ruleset) {
    const conversionResult = ruleset.reduce(convertDnrRule, { ruleset: [], nextId: ruleset.length > 0 ? ruleset[0].id : 1 })
    return conversionResult.ruleset
}
