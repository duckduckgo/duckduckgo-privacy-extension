/** @module trackerBlocking */

/**
 * Unfortunately it's a little tricky to interact with TypeScript Enum types
 * from JavaScript code, assigning the literal value (even if valid) results in
 * a type coercion error. As a workaround, use the backtick syntax to get the
 * possible enum values and then use those values to declare new types.
 * Hopefully, interacting with Enums will get easier in the future and this can
 * be removed.
 * @typedef {`${chrome.declarativeNetRequest.DomainType}`} DomainType
 * @typedef {`${chrome.declarativeNetRequest.RequestMethod}`} RequestMethod
 * @typedef {`${chrome.declarativeNetRequest.ResourceType}`} ResourceType
 * @typedef {`${chrome.declarativeNetRequest.RuleActionType}`} DNRRuleActionType
 * @typedef {Omit<chrome.declarativeNetRequest.RuleAction,
 *                'type' | 'redirect' | 'requestHeaders' | 'responseHeaders'> &
 *           {type: DNRRuleActionType, redirect?: object,
 *            requestHeaders?: object, responseHeaders?: object}} DNRRuleAction
 * @typedef {Omit<chrome.declarativeNetRequest.RuleCondition,
 *               'domainType' | 'excludedRequestMethods' |
 *               'excludedResourceTypes' | 'requestMethods' |
 *               'resourceTypes'> &
 *           {domainType?: DomainType, excludedRequestMethods?: RequestMethod[],
 *            excludedResourceTypes?: ResourceType[],
 *            requestMethods?: RequestMethod[],
 *            resourceTypes?: ResourceType[]}} DNRRuleCondition
 * @typedef {Omit<chrome.declarativeNetRequest.Rule,
 *                'id' | 'action' | 'condition'> &
 *           {id?: number, action: DNRRuleAction,
              condition: DNRRuleCondition}} DNRRule
 */

/**
 *  @typedef {import("../node_modules/@duckduckgo/privacy-grade/src/classes/trackers.js").TrackerObj} TrackerObj
 */

const { storeInLookup } = require('./utils')

// Priority that the Tracker Blocking declarativeNetRequest rules start from.
const BASELINE_PRIORITY = 10000

// Highest possible priority Tracker Blocking declarativeNetRequest rules can
// have. Necessary to ensure that the relative priority between the extension's
// declarativeNetRequest rules can be assured.
const CEILING_PRIORITY = 19999

// Each time a more specific tracker domain is found, the priority for
// corresponding declarativeNetRequest rules are incremented to ensure that
// longer matching tracker domains match first.
const SUBDOMAIN_PRIORITY_INCREMENT = 100

// Tracker entry's rules are matched in order, to achieve that the corresponding
// declarativeNetRequest rules are given a descending priority.
const TRACKER_RULE_PRIORITY_INCREMENT = 1

// Limit the number of tracker entries there can be for a domain, to avoid the
// ceiling priority from being exceeded.
const MAXIMUM_SUBDOMAIN_PRIORITY =
      CEILING_PRIORITY - (CEILING_PRIORITY % SUBDOMAIN_PRIORITY_INCREMENT)

// Limit the additional priority a tracker entry's rules can have, to avoid the
// subdomain priority increment from being exceeded by the tracker rule priority
// increment.
const MAXIMUM_TRACKER_RULE_PRIORITY_INCREMENT =
    SUBDOMAIN_PRIORITY_INCREMENT - TRACKER_RULE_PRIORITY_INCREMENT

// The declarativeNetRequest API limits the number of regular expression rules
// that can be added. At the time of writing the limit is 1000. Since some
// further regular expression declarativeNetRequest rules may be required for
// other aspects of the extension, set an arbitrary limit of 900 for
// Tracker Blocking.
// See https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#property-MAX_NUMBER_OF_REGEX_RULES
const MAXIMUM_REGEX_RULES = 900

// Characters that indicate a tracker rule needs to be treated as a regular
// expression (rather than a URL filter).
// Note: This is not perfect, but good enough for now to avoid using regexFilter
//       unless needed. In the future improvements could be made (e.g. by
//       ignoring a closing ']' unless an opening '[' was already seen).
const regularExpressionChars = new Set(
    ['.', '*', '+', '?', '{', '}', '[', ']', '{', '}']
)

// Tracker entries that 1. match cnames and 2. have rules that are anchored to
// the tracker domain, will not match correctly using a urlFilter. As a
// workaround, it is sometimes possible to instead use a regexFilter (in
// combination with the requestDomains condition) that matches any domain, while
// still anchoring the rest of the rule to the domain correctly.
const cnameDomainAnchor = '[a-z]+://[^/?]*'
const cnameDomainAnchorCompatibleRuleSuffix = /^(:[0-9]+)?[/?]/

// During ruleset generation, the trackerDomain is stored with each
// declarativeNetRequest rule to aid the creation of the trackerDomainByRuleId
// lookup.
const trackerDomainSymbol = Symbol('trackerDomain')

const resourceTypes = new Set([
    'main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font',
    'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket',
    'webtransport', 'webbundle', 'other'
])

/**
 * @typedef {object} generateDNRRuleDetails
 * @property {number} [id]
 * @property {number} priority
 * @property {DNRRuleActionType} actionType
 * @property {string} [urlFilter]
 * @property {string} [regexFilter]
 * @property {ResourceType[]} [resourceTypes]
 * @property {string[]} requestDomains
 * @property {string[]} [excludedRequestDomains]
 * @property {string[]} [initiatorDomains]
 * @property {string[]} [excludedInitiatorDomains]
 * @property {boolean} [matchCase]
 */

/**
 * Generates a declarativeNetRequest rule with the given details.
 * @param {generateDNRRuleDetails} ruleDetails
 * @return {DNRRule}
 */
function generateDNRRule ({
    id, priority, actionType, urlFilter, regexFilter, resourceTypes,
    requestDomains, excludedRequestDomains, initiatorDomains,
    excludedInitiatorDomains, matchCase = false
}) {
    /** @type {DNRRule} */
    const dnrRule = {
        priority,
        action: {
            type: actionType
        },
        condition: {
            requestDomains
        }
    }

    if (typeof id === 'number') {
        dnrRule.id = id
    }

    if (urlFilter) {
        dnrRule.condition.urlFilter = urlFilter

        // If the URL filter is anchored to a domain anyway, then additional
        // (included) request domain conditions don't serve a purpose.
        // Note: This is only a safe assumption since (so far) requestDomains
        //       never contain a subdomain of the domain in the URL filter. That
        //       is since:
        //         1. the domain in the URL filter is always the tracker entry's
        //            domain
        //         2. cname entries never map to a subdomain of the same tracker
        if (urlFilter[0] === '|' && urlFilter[1] === '|') {
            delete dnrRule.condition.requestDomains
        }

        if (!matchCase) {
            dnrRule.condition.isUrlFilterCaseSensitive = false
        }
    } else if (regexFilter) {
        dnrRule.condition.regexFilter = regexFilter

        if (!matchCase) {
            dnrRule.condition.isUrlFilterCaseSensitive = false
        }
    }

    if (resourceTypes && resourceTypes.length > 0) {
        dnrRule.condition.resourceTypes = resourceTypes
    }

    if (initiatorDomains && initiatorDomains.length > 0) {
        dnrRule.condition.initiatorDomains = initiatorDomains
    }

    if (excludedRequestDomains && excludedRequestDomains.length > 0) {
        dnrRule.condition.excludedRequestDomains = excludedRequestDomains
    }

    // Note: It's not necessary to exclude initiator domains for allowing rules
    //       since first-party requests will be allowed anyway.
    if (excludedInitiatorDomains &&
        excludedInitiatorDomains.length > 0 &&
        actionType !== 'allow') {
        if (excludedInitiatorDomains.length === 1 &&
            requestDomains.length === 1) {
            // Assume that if only one initiator domain is excluded (and there
            // is only one request domain), that the excluded initiator domain
            // is the same as the request domain.
            dnrRule.condition.domainType = 'thirdParty'
        } else {
            dnrRule.condition.excludedInitiatorDomains =
                excludedInitiatorDomains
        }
    }

    return dnrRule
}

function alphaChar (charCode) {
    return ((charCode >= 97 && charCode <= 122) ||
            (charCode >= 65 && charCode <= 90))
}

function parseTrackerRule (domain, trackerRule) {
    let requiresRegexFilter = false
    let urlFilter = ''
    let afterDomainRuleIndex = -1
    let lastAlphaIndex = -1

    let escaped = false
    let previousCharWasPeriod = false

    for (let i = 0; i < trackerRule.length; i++) {
        const char = trackerRule[i]
        const charCode = char.charCodeAt(0)

        if (urlFilter.length === domain.length && afterDomainRuleIndex === -1) {
            // Store the index in the trackerRule that corresponds to the first
            // character after the domain part. That is assuming the rule is
            // prefixed with the domain part... that is verified later.
            afterDomainRuleIndex = i
        }

        if (escaped) {
            // Matching (only) a '*' literal in a urlFilter does not seem to be
            // possible. (Tested as of Chromium M101.)
            if (char === '*') {
                requiresRegexFilter = true
                continue
            }

            if (alphaChar(charCode)) {
                lastAlphaIndex = i
            }

            escaped = false
            urlFilter += char
            continue
        }

        if (char === '\\') {
            escaped = true
            continue
        }

        if (char === '.') {
            previousCharWasPeriod = true
            continue
        }

        if (char === '*' && previousCharWasPeriod) {
            urlFilter += '*'
            previousCharWasPeriod = false
            continue
        }

        if (regularExpressionChars.has(char) || previousCharWasPeriod) {
            requiresRegexFilter = true
            continue
        }

        if (alphaChar(charCode)) {
            lastAlphaIndex = i
        }

        urlFilter += char
    }

    if (previousCharWasPeriod) {
        requiresRegexFilter = true
    }

    return {
        requiresRegexFilter, urlFilter, afterDomainRuleIndex, lastAlphaIndex
    }
}

function processTrackerRule (domain, trackerRule, matchCnames) {
    // If the tracker rule is empty, then neither urlFilter nor regexFilter are
    // necessary.
    if (!trackerRule) {
        return { }
    }

    let {
        requiresRegexFilter, urlFilter, afterDomainRuleIndex, lastAlphaIndex
    } = parseTrackerRule(domain, trackerRule)

    let regexFilter = trackerRule
    let matchCase = false
    let usedRegexForWorkaround = false

    if (urlFilter.startsWith(domain)) {
        // If the the urlFilter is the same length as the domain, then the
        // strings are equal (since the urlFilter starts with the domain).
        // Neither urlFilter nor regexFilter are necessary.
        if (urlFilter.length === domain.length) {
            return { }
        }

        // Ignore the domain when considering if the rule needs to be matched
        // case sensitively.
        matchCase = lastAlphaIndex < afterDomainRuleIndex

        if (urlFilter[domain.length] === '*') {
            // If the urlFilter is longer than the domain, but the next
            // character after the domain is a wildcard, the domain part +
            // wildcard can be safely removed. That is since the domain part of
            // a urlFilter only serves to anchor the filter against the start of
            // the URL's path (thanks to requestDomains conditions).
            // Note: Remove an extra character from the regexFilter, since the
            //       wild-card for a regular expression is '.*' rather than just
            //       '*'.
            regexFilter = regexFilter.substr(afterDomainRuleIndex + 2)
            urlFilter = urlFilter.substr(domain.length + 1)
        } else {
            // If the pattern needs to be anchored to the domain, and cname
            // matching is required, then a regexFilter is necessary to anchor
            // the rest of the filter to the request domain.
            // Note: This workaround only works if there is a '/' or '?'
            //       character directly after the domain (or port) part of the
            //       rule.
            if (matchCnames &&
                afterDomainRuleIndex > -1 &&
                cnameDomainAnchorCompatibleRuleSuffix
                    .test(urlFilter.substr(domain.length))) {
                usedRegexForWorkaround = true
                regexFilter = cnameDomainAnchor +
                                  trackerRule.substr(afterDomainRuleIndex)
            }

            // Prepend the '||' urlFilter domain anchor to improve matching
            // performance.
            urlFilter = '||' + urlFilter
        }
    } else {
        // If there isn't a (known) domain part, then case sensitive matching can
        // only happen if there were no alpha characters.
        matchCase = lastAlphaIndex === -1
    }

    if (requiresRegexFilter) {
        return { regexFilter, matchCase }
    }

    // The regular expression will sometimes be too complex (long) for a
    // declarativeNetRequest rule. Provide the urlFilter as a fallback, but note
    // that cnames will not be matched correctly by the urlFilter.
    if (usedRegexForWorkaround) {
        return { regexFilter, matchCase, urlFilterFallback: urlFilter }
    }

    return { urlFilter, matchCase }
}

function normalizeTypesCondition (types) {
    if (!types || types.length === 0) {
        return []
    }

    const normalizedTypes = new Set()
    for (const type of types) {
        switch (type) {
        case 'main_frame':
            // Main frame requests are never blocked as trackers. They are also
            // not blocked by the declarativeNetRequest API by default.
            continue
        case 'imageset':
            normalizedTypes.add('image')
            break
        default:
            if (resourceTypes.has(type)) {
                normalizedTypes.add(type)
            } else {
                normalizedTypes.add('other')
            }
        }
    }

    return Array.from(normalizedTypes)
}

function normalizeAction (action) {
    switch (action) {
    case 'ignore':
    case 'allow':
        return 'allow'
    default:
        return 'block'
    }
}

function normalizeTrackerRule (trackerRule) {
    if (trackerRule instanceof RegExp) {
        return trackerRule.source
    }

    return trackerRule
}

/**
 * Finds the closest matching tracker entry for the given domain. Returns the
 * tracking domain if one is found, null otherwise.
 * @param {Record<string, TrackerObj>} trackerEntries
 *   The trackers section of the Tracker Blocking configuration.
 * @param {string} domain
 *   The domain to search for. Subdomains will be stripped away until a matching
 *   tracker domain is found, or there are no more subdomains left.
 *   Note: Can optionally contain the "." prefix that is sometimes given for
 *         cname domain entries in the configuration.
 * @param {number} [skipSubdomains = 0]
 *   The number of subdomains to skip. Useful when checking if the given domain
 *   has further less-specific tracking entries that would have matched.
 * @return {string|null}
 *   The closest-matching (skipped subdomains allowing) tracking domain, or null
 *   if none are found.
 */
function getTrackerEntryDomain (trackerEntries, domain, skipSubdomains = 0) {
    // Strip leading '.' in cname entries, nothing otherwise.
    let i = domain[0] === '.' ? 0 : -1

    do {
        domain = domain.substr(i + 1)
        i = domain.indexOf('.')

        if (skipSubdomains > 0) {
            skipSubdomains -= 1
            continue
        }

        const trackerEntry = trackerEntries[domain]
        if (trackerEntry) {
            return domain
        }
    } while (i > -1)

    return null
}

function calculateTrackerEntryPriorities (tds) {
    const priorityByTrackerEntryDomain = new Map()

    for (let domain of Object.keys(tds.trackers)) {
        // Avoid recalculating the priority for domains.
        if (priorityByTrackerEntryDomain.has(domain)) {
            continue
        }

        // Search for all the matching tracker entries for this domain.
        let basePriority = BASELINE_PRIORITY
        const trackerEntryDomains = [domain]
        while (true) {
            const i = domain.indexOf('.')
            if (i === -1) {
                break
            }
            domain = domain.substr(i + 1)

            // If the priority is already calculated for this match, then start
            // from that. Otherwise, add it to the list and keep checking for
            // more matches.
            if (tds.trackers[domain]) {
                if (priorityByTrackerEntryDomain.has(domain)) {
                    basePriority = priorityByTrackerEntryDomain.get(domain) +
                        SUBDOMAIN_PRIORITY_INCREMENT
                    break
                }
                trackerEntryDomains.push(domain)
            }
        }

        // Assign all the matched tracker domains a priority based on their
        // length, starting from the first previously calculated priority
        // (if any).
        for (let i = trackerEntryDomains.length - 1; i >= 0; i--) {
            priorityByTrackerEntryDomain.set(
                trackerEntryDomains[i], basePriority
            )
            basePriority += SUBDOMAIN_PRIORITY_INCREMENT
        }
    }

    return priorityByTrackerEntryDomain
}

function removeRedundantDNRRules (dnrRules) {
    if (!dnrRules || dnrRules.length === 0) {
        return []
    }

    const {
        priority: defaultPriority,
        action: { type: defaultAction }
    } = dnrRules[0]

    let rulesToRemoveStartIndex = 1
    let rulesToRemoveCount = 0

    // No need to keep declarativeNetRequest rules for the default allow action
    // of tracker entries. Well, assuming that this tracker entry isn't taking
    // priority over another tracker entry.
    if (defaultPriority === BASELINE_PRIORITY && defaultAction === 'allow') {
        rulesToRemoveStartIndex = 0
        rulesToRemoveCount = 1
    }

    // No need to keep consecutive declarativeNetRequest rules with the default
    // action.
    for (let i = 1; i < dnrRules.length; i++) {
        if (dnrRules[i].action.type === defaultAction) {
            rulesToRemoveCount++
        } else {
            break
        }
    }

    if (rulesToRemoveCount > 0) {
        dnrRules.splice(rulesToRemoveStartIndex, rulesToRemoveCount)
    }

    return dnrRules
}

async function generateDNRRulesForTrackerEntry (
    trackerDomain, trackerEntry, requestDomains, excludedInitiatorDomains,
    priority, isRegexSupported
) {
    const dnrRules = []

    if (priority > MAXIMUM_SUBDOMAIN_PRIORITY) {
        throw new Error('Too many tracker entries for domain: ' + trackerDomain)
    }

    const defaultAction = normalizeAction(trackerEntry.default)
    const trackerEntryRules = trackerEntry.rules || []

    // Create the declarativeNetRequest rule for the tracker entry's default
    // action.
    dnrRules.push(
        generateDNRRule({
            priority,
            actionType: defaultAction,
            requestDomains,
            excludedInitiatorDomains
        })
    )

    const matchCnames = requestDomains.length > 1

    if (trackerEntryRules.length * TRACKER_RULE_PRIORITY_INCREMENT >
        MAXIMUM_TRACKER_RULE_PRIORITY_INCREMENT) {
        throw new Error('Too many rules for tracker domain:' + trackerDomain)
    }

    // Iterate through the tracker entry's rules backwards, since rules for a
    // tracker entry are matched in order and therefore the corresponding
    // declarativeNetRequest rules should have descending priority.
    // See https://github.com/duckduckgo/duckduckgo-privacy-extension/blob/develop/docs/blocking-algorithm.md
    for (let i = trackerEntryRules.length - 1; i >= 0; i--) {
        let {
            action: ruleAction,
            rule: trackerRule,
            exceptions: ruleExceptions
        } = trackerEntryRules[i]

        ruleAction = normalizeAction(ruleAction)
        trackerRule = normalizeTrackerRule(trackerRule)

        let {
            fallbackUrlFilter,
            urlFilter,
            regexFilter,
            matchCase
        } = processTrackerRule(trackerDomain, trackerRule, matchCnames)

        // If the required regular expression is too complex, then go with the
        // fallback urlFilter (if any). If there is no fallback, skip this rule.
        if (regexFilter) {
            const { isSupported } = await isRegexSupported({
                regex: regexFilter,
                isCaseSensitive: matchCase
            })

            if (!isSupported) {
                if (fallbackUrlFilter) {
                    regexFilter = undefined
                    urlFilter = fallbackUrlFilter
                } else {
                    continue
                }
            }
        }

        priority += TRACKER_RULE_PRIORITY_INCREMENT
        dnrRules.push(
            generateDNRRule({
                priority,
                actionType: ruleAction,
                urlFilter,
                regexFilter,
                matchCase,
                requestDomains,
                excludedInitiatorDomains
            })
        )

        if (ruleAction === 'block' && ruleExceptions) {
            // Incrementing this priority is not necessary since
            // declarativeNetRequest rules with an 'allow' action trump
            // declarativeNetRequest rules with a 'block' action of the same
            // priority.
            // See https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#matching-algorithm
            dnrRules.push(generateDNRRule({
                priority,
                actionType: 'allow',
                urlFilter,
                regexFilter,
                matchCase,
                resourceTypes: normalizeTypesCondition(ruleExceptions.types),
                requestDomains,
                initiatorDomains: ruleExceptions.domains
            }))
        }
    }

    return removeRedundantDNRRules(dnrRules)
}

function finalizeDNRRulesAndLookup (startingRuleId, dnrRules) {
    const ruleIdByByStringifiedDNRRule = new Map()
    const requestDomainsByRuleId = new Map()
    const trackerDomainsByRuleId = new Map()

    // Combine similar rules and create the ruleset.
    const ruleset = []
    let nextRuleId = startingRuleId
    for (const rule of dnrRules) {
        // Take note of the rule's trackerDomain.
        const trackerDomain = rule[trackerDomainSymbol]
        delete rule[trackerDomainSymbol]

        // Rules without a requestDomains condition definitely can't be
        // combined. Rules other than basic default allow/block almost never
        // will be in practice. For those cases just add the rule to the ruleset
        // now.
        if (!rule.condition.requestDomains ||
            rule.priority !== BASELINE_PRIORITY) {
            const ruleId = nextRuleId++
            rule.id = ruleId
            ruleset.push(rule)
            storeInLookup(trackerDomainsByRuleId, ruleId, [trackerDomain])
            continue
        }

        // Keep track of rules that (minus requestDomains conditions) have been
        // seen before.
        // Note: This is a simplistic way to generate a key for a
        //       declarativeNetRequest rule, but it works for now.
        let { requestDomains } = rule.condition
        delete rule.condition.requestDomains
        const key = JSON.stringify(rule)

        if (ruleIdByByStringifiedDNRRule.has(key)) {
            // Duplicate rule, note the extra domains.
            const ruleId = ruleIdByByStringifiedDNRRule.get(key)
            storeInLookup(trackerDomainsByRuleId, ruleId, [trackerDomain])
            storeInLookup(requestDomainsByRuleId, ruleId, requestDomains)
        } else {
            // New rule, add it to the ruleset.
            const ruleId = nextRuleId++
            rule.id = ruleId

            // Set the rule's request domains. Take care to use a fresh array,
            // so that any mutations don't apply to other rules by accident.
            requestDomains = requestDomains.slice()
            rule.condition.requestDomains = requestDomains
            ruleset.push(rule)

            // Also update the lookups.
            ruleIdByByStringifiedDNRRule.set(key, ruleId)
            storeInLookup(trackerDomainsByRuleId, ruleId, [trackerDomain])
            // Note: Using storeInLookup would create a new array instead of
            //       storing a reference to the existing array. That won't work
            //       since the existing array needs to be mutated to add the
            //       request domains for any duplicate rules.
            requestDomainsByRuleId.set(ruleId, requestDomains)
        }
    }

    // Create the ruleId -> trackerDomain lookup.
    const trackerDomainByRuleId = new Array(startingRuleId)
    for (let i = startingRuleId; i < startingRuleId + ruleset.length; i++) {
        trackerDomainByRuleId.push(trackerDomainsByRuleId.get(i).join(','))
    }

    return { ruleset, trackerDomainByRuleId }
}

/**
 * @typedef {object} generateTrackerBlockingRulesetResult
 * @property {DNRRule[]} ruleset
 *   The generated Tracker Blocking declarativeNetRequest ruleset.
 * @property {(null|string)[]} trackerDomainByRuleId
 *   Rule ID -> tracker domain mapping. Useful for translating a rule match to
 *   a tracker entry.
 */

/**
 * Converts a Tracker Blocking configuration into a declarativeNetRequest
 * ruleset that blocks trackers.
 * @param {object} tds
 *   The Tracker Blocking configuration.
 * @param {function} isRegexSupported
 *   A function compatible with chrome.declarativeNetRequest.isRegexSupported.
 *   See https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#method-isRegexSupported
 * @param {number} [startingRuleId = 1]
 *   Rule ID for the generated declarativeNetRequest rules to start from. Rule
 *   IDs are incremented sequentially from the starting point.
 * @return {Promise<generateTrackerBlockingRulesetResult>}
 */
async function generateTrackerBlockingRuleset (
    tds, isRegexSupported, startingRuleId = 1
) {
    if (typeof tds !== 'object' ||
        typeof tds.cnames !== 'object' || typeof tds.domains !== 'object' ||
        typeof tds.entities !== 'object' || typeof tds.trackers !== 'object') {
        throw new Error('Invalid block list.')
    }
    if (typeof isRegexSupported !== 'function') {
        throw new Error('Missing isRegexSupported function.')
    }

    const requestDomainsByTrackerDomain = new Map()

    // Ensure that tracker entries for more specific (longer) domains are
    // matched first, by giving the corresponding declarativeNetRequest rules
    // for longer domains a higher priority.
    const priorityByTrackerDomain = calculateTrackerEntryPriorities(tds)

    // Create a lookup of each tracker entry's domain, that matching cname
    // entries will be added to.
    for (const trackerDomain of Object.keys(tds.trackers)) {
        storeInLookup(
            requestDomainsByTrackerDomain, trackerDomain, [trackerDomain]
        )
    }

    // Handle cname mappings.
    for (const [domain, cname] of Object.entries(tds.cnames)) {
        // Find the appropriate tracker entry that the cname entry should apply
        // to.
        const trackerEntryDomain = getTrackerEntryDomain(tds.trackers, cname)
        if (trackerEntryDomain) {
            // There are some difficult edge-cases when the subdomain of a cname
            // entry has its own tracker entry. Requests are first checked
            // against the tracker entry, before the cname entry. Worse still,
            // if a rule matches the tracker entry and has the action of block,
            // the request will still be allowed (due to being first-party) even
            // if there's also a cname entry rule to block the request.
            // Therefore, for now skip cname mapping if there is a parent
            // tracker entry.
            // See https://github.com/duckduckgo/privacy-grade/blob/4d28937/src/classes/trackers.js#L111-L125
            if (getTrackerEntryDomain(tds.trackers, domain, 1)) {
                continue
            }

            // Strictly speaking, the domain should also be added to the
            // excluded initiator domains for the corresponding tracker entry's
            // entity. In practice however, this makes no difference and adds
            // significantly to the ruleset size.

            // Ensure that the cname is added to included request domains for
            // the matching tracker entry.
            storeInLookup(
                requestDomainsByTrackerDomain,
                trackerEntryDomain,
                [domain]
            )
        }
    }

    // Generate the declarativeNetRequest rules for the tracker entries.
    let regexRuleCount = 0
    const dnrRules = []
    for (const [trackerDomain, trackerEntry] of Object.entries(tds.trackers)) {
        const requestDomains = requestDomainsByTrackerDomain.get(trackerDomain)
        const excludedInitiatorDomains =
              tds.entities[trackerEntry.owner.name].domains
        const priority = priorityByTrackerDomain.get(trackerDomain)
        for (const rule of await generateDNRRulesForTrackerEntry(
            trackerDomain, trackerEntry, requestDomains,
            excludedInitiatorDomains, priority, isRegexSupported)
        ) {
            // Probably better to throw early, than to worry about the unlikely
            // situation where regular expression rules are combined to bring
            // the count below the limit.
            if (rule.condition.regexFilter &&
                ++regexRuleCount > MAXIMUM_REGEX_RULES) {
                throw new Error(
                    'Maximum number of regular expression rules exceeded!'
                )
            }

            rule[trackerDomainSymbol] = trackerDomain
            dnrRules.push(rule)
        }
    }

    return finalizeDNRRulesAndLookup(startingRuleId, dnrRules)
}

exports.BASELINE_PRIORITY = BASELINE_PRIORITY
exports.CEILING_PRIORITY = CEILING_PRIORITY
exports.SUBDOMAIN_PRIORITY_INCREMENT = SUBDOMAIN_PRIORITY_INCREMENT
exports.TRACKER_RULE_PRIORITY_INCREMENT = TRACKER_RULE_PRIORITY_INCREMENT
exports.MAXIMUM_SUBDOMAIN_PRIORITY = MAXIMUM_SUBDOMAIN_PRIORITY
exports.MAXIMUM_TRACKER_RULE_PRIORITY_INCREMENT =
    MAXIMUM_TRACKER_RULE_PRIORITY_INCREMENT
exports.MAXIMUM_REGEX_RULES = MAXIMUM_REGEX_RULES

exports.getTrackerEntryDomain = getTrackerEntryDomain
exports.generateDNRRule = generateDNRRule

exports.generateTrackerBlockingRuleset = generateTrackerBlockingRuleset
