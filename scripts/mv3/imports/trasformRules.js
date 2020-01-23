const SURROGATES_FOLDER = '/data/tracker_lists/surrogates/'
const mv3ResourceTypes = ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other']

function transformRegex (regex) {
    return regex.replace(/\\\//g, '/').replace(/\\\./g, '.').replace(/\.\*/g, '*')
}

function transformType (tdsType) {
    if (tdsType === 'subdocument') {
        return 'sub_frame'
    } else if (mv3ResourceTypes.includes(tdsType)) {
        return tdsType
    }

    throw new Error(`Unknown exception.type: ${tdsType}`)
}

/**
 * @param {TDSRule} inputRule
 * @param {Number} id
 * @param {string[]} firstPartyDomains
 * @returns {MV3Rule}
 */
function transformResourceRule (inputRule, id, firstPartyDomains) {
    /** @type {MV3Rule} */
    const rule = {
        id,
        // block rules should have a higher priority than HTTPS upgrade rules
        priority: 2,
        condition: {
            urlFilter: `||${transformRegex(inputRule.rule)}`,
            isUrlFilterCaseSensitive: false,
            excludedResourceTypes: ['main_frame'],
            domainType: 'thirdParty'
        },
        action: {
            type: 'block'
        }
    }

    if (firstPartyDomains) {
        // note: make a copy of an array not to modify the original
        rule.condition.excludedDomains = Array.from(firstPartyDomains)
    }

    if (inputRule.surrogate) {
        // surrogates should have a higher priority than block rules
        rule.priority = 3
        rule.action.type = 'redirect'
        rule.action.redirect = {
            extensionPath: SURROGATES_FOLDER + inputRule.surrogate
        }
    }

    if (inputRule.action === 'ignore') {
        // ignore rules should have higher priority than surrogates and block rules
        // but should not have higher priority than https upgrades i.e. even though it's ignored
        // it should still be upgraded if domain is upgradable to HTTPS
        rule.priority = 4
        rule.action.type = 'allow'
    }

    if (inputRule.exceptions) {
        if (inputRule.exceptions.domains && inputRule.exceptions.domains.length) {
            rule.condition.excludedDomains = rule.condition.excludedDomains || []
            inputRule.exceptions.domains.map(domain => rule.condition.excludedDomains.push(domain))
        }

        if (inputRule.exceptions.types && inputRule.exceptions.types.length) {
            inputRule.exceptions.types.forEach(tdsType => rule.condition.excludedResourceTypes.push(transformType(tdsType)))
        }
    }

    return rule
}

/**
 * @param {{trackers: Object.<String, TDSTracker>, entities: Object.<String, TDSEntity>}} tds
 * @returns {{stats: {allRules: Number, blockRules: Number, ignoreRules: Number, surrogates: Number}, rules: MV3Rule[]}}
 */
function transform (tds) {
    /** @type {MV3Rule[]} */
    const rules = []
    const stats = {
        allRules: 0,
        blockRules: 0,
        ignoreRules: 0,
        surrogates: 0
    }
    let ruleId = 1

    Object.values(tds.trackers).forEach((/** @type {TDSTracker} **/ tracker) => {
        /** @type {TDSEntity} */
        const owner = tracker.owner && tracker.owner.name && tds.entities[tracker.owner.name]
        const ownerOtherDomains = owner && owner.domains && owner.domains.filter(domain => domain !== tracker.domain)

        if (tracker.default === 'block') {
            stats.blockRules++
            /** @type {MV3Rule} */
            const rule = {
                id: ruleId++,
                priority: 2,
                condition: {
                    urlFilter: `||${tracker.domain}`,
                    isUrlFilterCaseSensitive: false,
                    excludedResourceTypes: ['main_frame'],
                    domainType: 'thirdParty'
                },
                action: {type: 'block'}
            }

            if (ownerOtherDomains && ownerOtherDomains.length) {
                rule.condition.excludedDomains = ownerOtherDomains
            }

            rules.push(rule)
        } else if (tracker.default !== 'ignore') {
            throw new Error(`Unknown tracker.default: ${tracker.default}`)
        }

        if (tracker.rules && tracker.rules.length) {
            // exceptions from the default rule
            tracker.rules.forEach(resourceRule => {
                if (resourceRule.surrogate) {
                    stats.surrogates++
                } else if (resourceRule.action === 'ignore') {
                    stats.ignoreRules++
                } else if (resourceRule.action === 'block' || !resourceRule.action) {
                    stats.blockRules++
                } else {
                    throw new Error(`Unknown rule.action: ${resourceRule.action}`)
                }

                rules.push(transformResourceRule(resourceRule, ruleId++, ownerOtherDomains))
            })
        }
    })

    stats.allRules = rules.length

    return {
        rules,
        stats
    }
}

/**
 * @typedef {Object} TDSTracker
 * @property {String} domain
 * @property {'ignore'|'block'} default
 * @property {TDSOwner} owner
 * @property {String[]} source
 * @property {Number} prevalence
 * @property {0|1|2|3} fingerprinting
 * @property {Number} cookies
 * @property {{time: 1|2|3, size: 1|2|3, cpu: 1|2|3, cache: 1|2|3}} performance
 * @property {String[]} categories
 * @property {TDSRule[]=} rules
 */

/**
 * @typedef {Object} TDSRule
 * @property {String} rule
 * @property {'block'|'ignore'=} action
 * @property {{types: String[], domains: String[]}=} exceptions
 * @property {String=} surrogate
 */

/**
 * @typedef {Object} TDSOwner
 * @property {String} name
 * @property {String} displayName
 * @property {String} privacyPolicy
 * @property {String} url
 */

/**
 * @typedef {Object} TDSEntity
 * @property {String[]} domains
 * @property {String} displayName
 * @property {Number} prevalence
 */

/**
 * @typedef {Object} MV3Rule
 * @property {Number} id
 * @property {MV3Action} action
 * @property {MV3Condition} condition
 * @property {Number} priority
 */

/**
 * @typedef {Object} MV3Action
 * @property {String} type
 * @property {{extensionPath: String}=} redirect
 */

/**
 * @typedef {Object} MV3Condition
 * @property {String} urlFilter
 * @property {Boolean=} isUrlFilterCaseSensitive
 * @property {String[]=} excludedResourceTypes
 * @property {String[]=} resourceTypes
 * @property {String=} domainType
 * @property {String[]=} excludedDomains
 * @property {String[]=} domains
 */

module.exports = transform
