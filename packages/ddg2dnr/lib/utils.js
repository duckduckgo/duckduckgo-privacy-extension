/** @module utils */

/**
 * @typedef {import('../node_modules/@duckduckgo/privacy-grade/src/classes/trackers.js').TrackerObj} TrackerObj
 * @typedef {{
 *  domains: string[];
 *  prevalence: number;
 *  displayName: string;
 * }} Entity
 * @typedef {{
 *  trackers: Record<string, TrackerObj>;
 *  entities: Record<string, Entity>;
 *  cnames: Record<string, string>;
 * }} TDS
 */

/**
 * @typedef {{
 *   domain: string;
 *   reason: string
 * }} PrivacyConfigDomainEntry
 */
/**
 * @typedef {object} PrivacyConfigFeature
 * @property {string} state
 * @property {string | undefined} minSupportedVersion
 * @property {string} hash
 * @property {S} settings
 * @property {PrivacyConfigDomainEntry[]} exceptions
 * @template S
 */
/**
 * @typedef {object} PrivacyConfiguration
 * @property {PrivacyConfigDomainEntry[]} unprotectedTemporary
 * @property {{
 *  cookie?: PrivacyConfigFeature<{
 *      trackerCookie: string;
 *      nonTrackerCookie: string;
 *      excludedCookieDomains: PrivacyConfigDomainEntry[];
 *  }>
 * }} features
 */
/**
 * @typedef {{[ruleId: number]: {
 *   type: string;
 *   possibleTrackerDomains?: string[];
 *   domain?: string;
 *   reason?: string;
 * }}} MatchDetailsByRuleId
*/
/**
 * @typedef RulesetResult
 * @property {import('./utils.js').DNRRule[]} ruleset
 *   The generated Tracker Blocking declarativeNetRequest ruleset.
 * @property {MatchDetailsByRuleId} matchDetailsByRuleId
 *   Rule ID -> match details.
 */

/**
 * Unfortunately it's a little tricky to interact with TypeScript Enum types
 * from JavaScript code, assigning the literal value (even if valid) results in
 * a type coercion error. As a workaround, use the backtick syntax to get the
 * possible enum values and then use those values to declare new types.
 * Hopefully, interacting with Enums will get easier in the future and this can
 * be removed.
 * @typedef {`${chrome.declarativeNetRequest.DomainType}`} DomainType
 * @typedef {`${chrome.declarativeNetRequest.RequestMethod}`} RequestMethod
 * @typedef {`${chrome.declarativeNetRequest.ResourceType}` |
 *           'webbundle' | 'webtransport'} ResourceType
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
 *            condition: DNRRuleCondition}} DNRRule
 */

// Tracker entries that 1. match cnames and 2. have rules that are anchored to
// the tracker domain, will not match correctly using a urlFilter. As a
// workaround, it is sometimes possible to instead use a regexFilter (in
// combination with the requestDomains condition) that matches any domain, while
// still anchoring the rest of the rule to the domain correctly.
const cnameDomainAnchor = '[a-z]+://[^/?]*'
const cnameDomainAnchorCompatibleRuleSuffix = /^(:[0-9]+)?[/?]/

// Characters that indicate a tracker rule needs to be treated as a regular
// expression (rather than a URL filter).
// Note: This is not perfect, but good enough for now to avoid using regexFilter
//       unless needed. In the future improvements could be made (e.g. by
//       ignoring a closing ']' unless an opening '[' was already seen).
const regularExpressionChars = new Set(
    ['.', '*', '+', '?', '{', '}', '[', ']', '{', '}']
)

function storeInMapLookup (lookup, key, values) {
    let storedValues = lookup.get(key)
    if (!storedValues) {
        storedValues = []
        lookup.set(key, storedValues)
    }
    for (const value of values) {
        storedValues.push(value)
    }
}

function storeInObjectLookup (lookup, key, values) {
    let storedValues = lookup[key]
    if (!storedValues) {
        storedValues = []
        lookup[key] = storedValues
    }
    for (const value of values) {
        storedValues.push(value)
    }
}

/**
 * Stores the given values in the given lookup for the given key. Takes care to
 * create the values array for the key if it doesn't already exist. Handles both
 * Maps and raw Objects.
 * Note: If lookup is a raw Object, the key will be treated as a string. Provide
 *       a string for such keys, or a value that can be sensibly converted to
 *       one.
 * @param {Map|Object} lookup
 * @param {any} key
 * @param {any[]} values
 */
function storeInLookup (lookup, key, values) {
    if (lookup instanceof Map) {
        storeInMapLookup(lookup, key, values)
    } else {
        storeInObjectLookup(lookup, key, values)
    }
}

/**
 * @typedef {object} generateDNRRuleDetails
 * @property {number} [id]
 * @property {number} priority
 * @property {DNRRuleActionType} actionType
 * @property {object} [redirect]
 * @property {object[]} [requestHeaders]
 * @property {object[]} [responseHeaders]
 * @property {string} [urlFilter]
 * @property {string} [regexFilter]
 * @property {ResourceType[] | null} [resourceTypes]
 * @property {ResourceType[] | null} [excludedResourceTypes]
 * @property {string[]} [requestDomains]
 * @property {string[]} [excludedRequestDomains]
 * @property {string[]} [initiatorDomains]
 * @property {string[]} [excludedInitiatorDomains]
 * @property {boolean} [matchCase]
 * @property {number[]} [tabIds]
 * @property {number[]} [excludedTabIds]
 * @property {RequestMethod[]} [requestMethods]
 * @property {RequestMethod[]} [excludedRequestMethods]
 */

/**
 * Generates a declarativeNetRequest rule with the given details.
 * @param {generateDNRRuleDetails} ruleDetails
 * @return {DNRRule}
 */
function generateDNRRule ({
    id, priority, actionType, redirect, requestHeaders, responseHeaders,
    urlFilter, regexFilter, resourceTypes, excludedResourceTypes,
    requestDomains, excludedRequestDomains, initiatorDomains,
    excludedInitiatorDomains, matchCase = false, tabIds, excludedTabIds,
    requestMethods, excludedRequestMethods
}) {
    /** @type {DNRRule} */
    const dnrRule = {
        priority,
        action: {
            type: actionType
        },
        condition: {
        }
    }

    if (typeof id === 'number') {
        dnrRule.id = id
    }

    if (requestDomains && requestDomains.length > 0) {
        dnrRule.condition.requestDomains = requestDomains
    }

    if (actionType === 'redirect' && redirect) {
        dnrRule.action.redirect = redirect
    }

    if (actionType === 'modifyHeaders') {
        if (requestHeaders && requestHeaders.length > 0) {
            dnrRule.action.requestHeaders = requestHeaders
        }
        if (responseHeaders && responseHeaders.length > 0) {
            dnrRule.action.responseHeaders = responseHeaders
        }
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

    if (excludedResourceTypes && excludedResourceTypes.length > 0) {
        dnrRule.condition.excludedResourceTypes = excludedResourceTypes
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
            requestDomains && requestDomains.length === 1) {
            // Assume that if only one initiator domain is excluded (and there
            // is only one request domain), that the excluded initiator domain
            // is the same as the request domain.
            dnrRule.condition.domainType = 'thirdParty'
        } else {
            dnrRule.condition.excludedInitiatorDomains =
                excludedInitiatorDomains
        }
    }

    if (tabIds && tabIds.length > 0) {
        dnrRule.condition.tabIds = tabIds
    }

    if (excludedTabIds && excludedTabIds.length > 0) {
        dnrRule.condition.excludedTabIds = excludedTabIds
    }

    if (requestMethods && requestMethods.length > 0) {
        dnrRule.condition.requestMethods = requestMethods
    }

    if (excludedRequestMethods && excludedRequestMethods.length > 0) {
        dnrRule.condition.excludedRequestMethods = excludedRequestMethods
    }

    return dnrRule
}

function alphaChar (charCode) {
    return ((charCode >= 97 && charCode <= 122) ||
            (charCode >= 65 && charCode <= 90))
}

function parseRegexTrackerRule (domain, trackerRule) {
    let requiresRegexFilter = false
    let urlFilter = ''
    let afterDomainRuleIndex = -1
    let lastAlphaIndex = -1

    let escaped = false
    let previousCharWasPeriod = false

    for (let i = 0; i < trackerRule.length; i++) {
        const char = trackerRule[i]
        const charCode = char.charCodeAt(0)

        if (domain && urlFilter.length === domain.length &&
            afterDomainRuleIndex === -1) {
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

/**
 * @typedef processRegexTrackerRuleResult
 * @property {string} [urlFilter]
 *   declarativeNetRequest urlFilter condition necessary to match this rule.
 * @property {string} [regexFilter]
 *   declarativeNetRequest regexFilter condition necessary to match this rule.
 * @property {string} [fallbackUrlFilter]
 *   A suboptimal urlFilter condition that can be used as a fallback if the
 *   provided regexFilter is not supported by the declarativeNetRequest API.
 * @property {boolean} [matchCase]
 *   False if case insensitive matching is required for this rule.
 */

/**
 * Figure out the declarativeNetRequest urlFilter or regexFilter (if any)
 * necessary for matching the given regular expression tracker rule.
 * @param {string|null} domain
 *   The tracker entry's domain, or null if unknown.
 * @param {string} trackerRule
 *   The tracker entry's rule (regular expression string).
 * @param {boolean} matchCnames
 *   If cname matching is necessary for this rule.
 * @return {processRegexTrackerRuleResult}
 */
function processRegexTrackerRule (domain, trackerRule, matchCnames) {
    // If the tracker rule is empty, then neither urlFilter nor regexFilter are
    // necessary.
    if (!trackerRule) {
        return { }
    }

    let {
        requiresRegexFilter, urlFilter, afterDomainRuleIndex, lastAlphaIndex
    } = parseRegexTrackerRule(domain, trackerRule)

    let regexFilter = trackerRule
    let matchCase = false
    let usedRegexForWorkaround = false

    if (domain && urlFilter.startsWith(domain)) {
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
        // If there isn't a (known) domain part, then case sensitive matching
        // can only happen if there were no alpha characters.
        matchCase = lastAlphaIndex === -1
    }

    if (requiresRegexFilter) {
        return { regexFilter, matchCase }
    }

    // The regular expression will sometimes be too complex (long) for a
    // declarativeNetRequest rule. Provide the urlFilter as a fallback, but note
    // that cnames will not be matched correctly by the urlFilter.
    if (usedRegexForWorkaround) {
        return { regexFilter, matchCase, fallbackUrlFilter: urlFilter }
    }

    return { urlFilter, matchCase }
}

/**
 * @typedef processPlaintextTrackerRuleResult
 * @property {string} urlFilter
 *   declarativeNetRequest urlFilter condition necessary to match this rule.
 * @property {boolean} matchCase
 *   False if case insensitive matching is required for this rule.
 */

/**
 * Figure out the declarativeNetRequest urlFilter necessary for matching the
 * given plain-text tracker rule.
 * @param {string|null} domain
 *   The tracker entry's domain, or null if unknown.
 * @param {string} trackerRule
 *   The tracker entry's rule (literal string to match).
 * @return {processPlaintextTrackerRuleResult}
 */
function processPlaintextTrackerRule (domain, trackerRule) {
    let urlFilter = trackerRule

    if (domain && urlFilter.startsWith(domain)) {
        urlFilter = '||' + urlFilter
    }

    // Note: In the future it would be nice to avoid case-insensitive matching
    //       unless necessary. The logic to do that could potentially be shared
    //       with processRegexTrackerRule.
    const matchCase = false

    return { urlFilter, matchCase }
}

/**
 * Finds the closest matching tracker entry for the given domain. Returns the
 * tracking domain if one is found, null otherwise.
 * @param {Record<string, import('./utils.js').TrackerObj>} trackerEntries
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

/**
 * Generate a mapping from tracker domain to a list of related aliases (via CNAME) as well as itself
 * @param {TDS} tds Tracker blocklist
 * @returns {Map<string, string[]>} domain mapping
 */
function generateRequestDomainsByTrackerDomain (tds) {
    const requestDomainsByTrackerDomain = new Map()
    // Create a lookup of each tracker entry's domain, that matching cname
    // entries will be added to.
    for (const trackerDomain of Object.keys(tds.trackers)) {
        storeInLookup(
            requestDomainsByTrackerDomain, trackerDomain, [trackerDomain]
        )
    }
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
    return requestDomainsByTrackerDomain
}

/** @type Set<ResourceType> */
const resourceTypes = new Set([
    'main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font',
    'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket',
    'webtransport', 'webbundle', 'other'
])

exports.resourceTypes = resourceTypes
exports.storeInLookup = storeInLookup
exports.generateDNRRule = generateDNRRule
exports.processRegexTrackerRule = processRegexTrackerRule
exports.processPlaintextTrackerRule = processPlaintextTrackerRule
exports.getTrackerEntryDomain = getTrackerEntryDomain
exports.generateRequestDomainsByTrackerDomain = generateRequestDomainsByTrackerDomain
