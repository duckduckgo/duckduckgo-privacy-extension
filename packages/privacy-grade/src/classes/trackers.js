/**
 * @typedef TrackerData
 * @property {ActionName} action
 * @property {string} reason
 * @property {boolean} sameEntity
 * @property {boolean} sameBaseDomain
 * @property {string | false} redirectUrl
 * @property {TrackerRule | null} matchedRule
 * @property {boolean} matchedRuleException
 * @property {TrackerObj} [tracker]
 * @property {string} fullTrackerDomain
 * @property {string} [fromCname]
 */

/**
 * @typedef TrackerRule
 * @property {string | RegExp} rule
 * @property {string} [action]
 * @property {number} fingerprinting
 * @property {number} cookies
 * @property {RuleDefinition} [exceptions]
 * @property {RuleDefinition} [options]
 * @property {string} [surrogate]
 * @property {boolean} [strictRedirect]
 */

/**
 * @typedef RuleDefinition
 * @property {string[]} [domains]
 * @property {string[]} [types]
 */

/**
 * @typedef OwnerData
 * @property {string} name
 * @property {string} displayName
 * @property {string} [ownedBy]
 */

/**
 * @typedef TrackerObj
 * @property {string} domain
 * @property {OwnerData} owner
 * @property {number} prevalence
 * @property {number} fingerprinting
 * @property {number} cookies
 * @property {string[]} categories
 * @property {ActionName} default
 * @property {TrackerRule[]} rules
 */

/**
 * @typedef RequestData
 * @property {string} siteUrl
 * @property {RequestExpression} request
 * @property {boolean} sameBaseDomain
 * @property {string} siteDomain
 * @property {string[]} siteUrlSplit
 * @property {string} urlToCheck
 * @property {string} urlToCheckDomain
 * @property {string[]} urlToCheckSplit
 */

/**
 * @typedef RequestExpression
 * @property {string} type
 */

/**
 * @typedef {'ignore' | 'block' | 'redirect' | 'none' | 'ad-attribution' | 'ignore-user'} ActionName
 */

/**
 * @typedef EntityData
 * @property {number} prevalence
 * @property {string} displayName
 * @property {string[]} domains
 */

class Trackers {
    static standardRuleActions = new Set(['block', 'ignore'])

    /**
     * @param {{
     *    tldts: import('tldts'),
     *    tldjs: import('tldts'),
     *    utils: *,
     * }} ops
     */
    constructor (ops) {
        this.tldts = ops.tldts || ops.tldjs
        this.utils = ops.utils
    }

    /**
     * @param {{data: *, name: string}[]} lists
     */
    setLists (lists) {
        lists.forEach(list => {
            if (list.name === 'tds') {
                this.entityList = this.processEntityList(list.data.entities)
                this.trackerList = this.processTrackerList(list.data.trackers)
                this.domains = list.data.domains
                this.cnames = list.data.cnames
            } else if (list.name === 'surrogates') {
                this.surrogateList = this.processSurrogateList(list.data)
            }
        })
    }

    /**
     * @param {Record<string, TrackerObj>} data
     * @returns {*}
     */
    processTrackerList (data) {
        for (const name in data) {
            if (data[name].rules) {
                for (const i in data[name].rules) {
                    data[name].rules[i].rule = new RegExp(data[name].rules[i].rule, 'ig')
                }
            }
        }
        return data
    }

    /**
     * @param {Record<string, EntityData>} data
     * @returns {Record<string, string>}
     */
    processEntityList (data) {
        /** @type {Record<string, string>} */
        const processed = {}
        for (const entity in data) {
            data[entity].domains.forEach(domain => {
                processed[domain] = entity
            })
        }
        return processed
    }

    /**
     * @param {string} text
     * @returns {Record<string, string>}
     */
    processSurrogateList (text) {
        const b64dataheader = 'data:application/javascript;base64,'
        /** @type {Record<string, string>} */
        const surrogateList = {}
        const splitSurrogateList = text.trim().split('\n\n')

        splitSurrogateList.forEach(sur => {
            // remove comment lines
            const lines = sur.split('\n').filter((line) => {
                return !(/^#.*/).test(line)
            })

            // remove first line, store it
            const firstLine = lines.shift()
            if (!firstLine) {
                return
            }

            // take identifier from first line
            const pattern = firstLine.split(' ')[0].split('/')[1]
            const b64surrogate = btoa(lines.join('\n').toString())
            surrogateList[pattern] = b64dataheader + b64surrogate
        })
        return surrogateList
    }

    /**
     * @param {string} url
     * @returns {{fromCname: string | undefined, finalURL: string}}
     */
    resolveCname (url) {
        const parsed = this.tldts.parse(url, { allowPrivateDomains: true })
        let finalURL = url
        let fromCname
        if (parsed && this.cnames && parsed.domain) {
            let domain = parsed.domain
            if (parsed.subdomain) {
                domain = parsed.subdomain + '.' + domain
            }
            const finalDomain = this.cnames[domain] || domain
            finalURL = finalURL.replace(domain, finalDomain)
            if (finalDomain !== domain) {
                fromCname = domain
            }
        }
        return {
            fromCname,
            finalURL
        }
    }

    /**
     * Copied from extension (FIX)
     * @param {string} urlString
     **/
    getBaseDomain (urlString) {
        const parsedUrl = this.tldts.parse(urlString, { allowPrivateDomains: true })
        return parsedUrl.domain || parsedUrl.hostname
    }

    /**
     * single object with all of our request and site data split and
     * processed into the correct format for the tracker set/get functions.
     * This avoids repeat calls to split and util functions.
     * @param {string} urlToCheck
     * @param {string} siteUrl
     * @param {RequestExpression} request
     * @returns {RequestData | null}
     */
    getRequestData (urlToCheck, siteUrl, request) {
        const siteDomain = this.getBaseDomain(siteUrl)
        const urlToCheckDomain = this.getBaseDomain(urlToCheck)
        if (!siteDomain || !urlToCheckDomain) {
            return null
        }
        return {
            siteUrl: siteUrl,
            request: request,
            sameBaseDomain: siteDomain === urlToCheckDomain,
            siteDomain,
            siteUrlSplit: this.utils.extractHostFromURL(siteUrl).split('.'),
            urlToCheck: urlToCheck,
            urlToCheckDomain,
            urlToCheckSplit: this.utils.extractHostFromURL(urlToCheck).split('.')
        }
    }

    /**
     * @param {string} url
     * @returns {boolean}
     */
    isSpecialURL (url) {
        let urlObj
        try {
            urlObj = new URL(url)
        } catch {
            // This really shouldn't happen but if it does, we'll just assume it's a special URL
            return true
        }
        const specialProtocols = [
            // Browser specific internal protocols
            'chrome-extension:',
            'chrome-devtools:',
            'chrome-search:',
            'chrome:',
            'edge:',
            'opera:',
            'about:',
            'moz-extension:',

            // Special web protocols
            'file:',
            'javascript:',
            'data:',
            'blob:',
            'view-source:',
            'vbscript:',

            // Safelisted protocol handler schemes (https://html.spec.whatwg.org/#safelisted-scheme)
            'bitcoin:',
            'ftp:',
            'ftps:',
            'geo:',
            'im:',
            'irc:',
            'ircs:',
            'magnet:',
            'mailto:',
            'matrix:',
            'mms:',
            'news:',
            'nntp:',
            'openpgp4fpr:',
            'sftp:',
            'sip:',
            'sms:',
            'smsto:',
            'ssh:',
            'tel:',
            'urn:',
            'webcal:',
            'wtai:',
            'xmpp:'
        ]
        if (urlObj) {
            if (specialProtocols.includes(urlObj.protocol) ||
                // https://html.spec.whatwg.org/#web+-scheme-prefix
                urlObj.protocol.startsWith('web+') ||
                urlObj.hostname === 'localhost') {
                return true
            }
        }
        return false
    }

    /**
     * @param {string} urlToCheck
     * @param {string} siteUrl
     * @param {RequestExpression} request
     * @param {Set<string>} [supportedCustomRuleActions]
     *   Optional set containing supported "custom" (aka non-standard) rule
     *   actions.
     *   Note: Standard block/ignore rule actions are always supported, and do
     *         not need to be included here. Custom rule actions are only
     *         necessary for features like Click to Load that have their own
     *         special rule actions.
     *         @see {Trackers.prototype.standardRuleActions}.
     * @returns {TrackerData | null}
     */
    getTrackerData (urlToCheck, siteUrl, request, supportedCustomRuleActions) {
        if (!this.entityList || !this.trackerList) {
            throw new Error('tried to detect trackers before rules were loaded')
        }

        if (this.isSpecialURL(urlToCheck) || this.isSpecialURL(siteUrl)) {
            return null
        }

        let fromCname
        let requestData = this.getRequestData(urlToCheck, siteUrl, request)
        if (!requestData) {
            return null
        }
        // We don't want to use CNAME check for this caluclation as we would avoid showing in the panel.
        // So we're calcuating this before the CNAME check.
        const sameBaseDomain = requestData.sameBaseDomain

        // finds a tracker definition by iterating over the whole trackerList and finding the matching tracker.
        let tracker = this.findTracker(requestData)

        if (!tracker) {
            // if request doesn't have any rules associated with it, we should check if it's a CNAMEed tracker
            const cnameResolution = this.resolveCname(urlToCheck)
            const cnameRequestData = this.getRequestData(cnameResolution.finalURL, siteUrl, request)
            if (cnameResolution.fromCname && cnameRequestData) {
                tracker = this.findTracker(cnameRequestData)
                if (tracker) {
                    fromCname = cnameResolution.fromCname
                    requestData = cnameRequestData
                }
            }
        }

        const fullTrackerDomain = requestData.urlToCheckSplit.join('.')
        const requestOwner = this.findTrackerOwner(requestData.urlToCheckDomain)
        const websiteOwner = this.findWebsiteOwner(requestData)
        const sameEntity = (requestOwner && websiteOwner) ? requestOwner === websiteOwner : requestData.siteDomain === requestData.urlToCheckDomain

        if (!tracker) {
            if (sameEntity) {
                return null
            }
            const owner = {
                name: requestOwner || requestData.urlToCheckDomain || 'unknown',
                displayName: requestOwner || requestData.urlToCheckDomain || 'Unknown'
            }
            /** @type {TrackerObj} */
            const trackerObj = {
                domain: fullTrackerDomain,
                owner: owner,
                prevalence: 0,
                fingerprinting: 0,
                cookies: 0,
                categories: [],
                default: 'none',
                rules: []
            }
            return {
                action: trackerObj.default,
                reason: '',
                sameEntity,
                sameBaseDomain,
                redirectUrl: '',
                matchedRule: null,
                matchedRuleException: false,
                tracker,
                fullTrackerDomain,
                fromCname
            }
        }
        // finds a matching rule by iterating over the rules in tracker.data and sets redirectUrl.
        const matchedRule = this.findRule(tracker, requestData, supportedCustomRuleActions)

        // @ts-ignore
        const redirectUrl = (matchedRule && matchedRule.surrogate) ? this.surrogateList[matchedRule.surrogate] : false

        // sets tracker.exception by looking at tracker.rule exceptions (if any)
        const matchedRuleException = matchedRule ? this.matchesRuleDefinition(matchedRule, 'exceptions', requestData) : false

        const { action, reason } = this.getAction({
            sameEntity,
            matchedRule,
            matchedRuleException,
            defaultAction: tracker.default,
            redirectUrl
        })
        return {
            action,
            reason,
            sameEntity,
            sameBaseDomain,
            redirectUrl,
            matchedRule,
            matchedRuleException,
            tracker,
            fullTrackerDomain,
            fromCname
        }
    }

    /**
     * Pull subdomains off of the request rule and look for a matching tracker object in our data
     * @param {{urlToCheckSplit: string[]}} urlToCheckObject
     * @returns {undefined | TrackerObj}
     */
    findTracker (urlToCheckObject) {
        if (!this.trackerList) {
            throw new Error('tried to detect trackers before rules were loaded')
        }
        const urlList = Array.from(urlToCheckObject.urlToCheckSplit)
        while (urlList.length > 1) {
            const trackerDomain = urlList.join('.')
            urlList.shift()

            const matchedTracker = this.trackerList[trackerDomain]
            if (matchedTracker) {
                return matchedTracker
            }
        }
    }

    /**
     * @param {string} trackerDomain
     * @returns {string | undefined}
     */
    findTrackerOwner (trackerDomain) {
        // @ts-ignore
        return this.entityList[trackerDomain]
    }

    /**
     * Set parent and first party values on tracker
     * @param {{siteUrlSplit: string[]}} siteUrlSplitObject
     * @returns {string | undefined}
     */
    findWebsiteOwner (siteUrlSplitObject) {
        // find the site owner
        const siteUrlList = Array.from(siteUrlSplitObject.siteUrlSplit)

        while (siteUrlList.length > 1) {
            const siteToCheck = siteUrlList.join('.')
            siteUrlList.shift()

            // @ts-ignore
            if (this.entityList[siteToCheck]) {
                // @ts-ignore
                return this.entityList[siteToCheck]
            }
        }
    }

    /**
     * Returns false if the given rule has an unsupported rule action, true
     * otherwise.
     * @param {TrackerRule} ruleObj
     * @param {Set<string>} [supportedCustomRuleActions]
     * @returns {boolean}
     */
    ruleActionSupported ({ action }, supportedCustomRuleActions) {
        return (
            // Rule action generally defaults to 'block' if omitted.
            !action ||
            // Standard rule actions are always supported.
            Trackers.standardRuleActions.has(action) ||
            // Provided custom rule actions (if any) are also supported.
            (!!supportedCustomRuleActions && supportedCustomRuleActions.has(action))
        )
    }

    /**
     * Iterate through a tracker rule list and return the first matching rule, if any.
     * @param {TrackerObj} tracker
     * @param {RequestData} requestData
     * @param {Set<string>} [supportedCustomRuleActions]
     * @returns {TrackerRule | null}
     */
    findRule (tracker, requestData, supportedCustomRuleActions) {
        let matchedRule = null
        // Find a matching rule from this tracker
        if (tracker.rules && tracker.rules.length) {
            tracker.rules.some(ruleObj => {
                if (this.requestMatchesRule(requestData, ruleObj) &&
                    this.ruleActionSupported(ruleObj, supportedCustomRuleActions)) {
                    matchedRule = ruleObj
                    return true
                }
                return false
            })
        }
        return matchedRule
    }

    /**
     * @param {RequestData} requestData
     * @param {TrackerRule} ruleObj
     * @returns {boolean}
     */
    requestMatchesRule (requestData, ruleObj) {
        if (requestData.urlToCheck.match(ruleObj.rule)) {
            if (ruleObj.options) {
                return this.matchesRuleDefinition(ruleObj, 'options', requestData)
            } else {
                return true
            }
        } else {
            return false
        }
    }

    /**
     * Check the matched rule options against the request data
     * @param {TrackerRule} rule
     * @param {'exceptions' | 'options'} type
     * @param {RequestData} requestData
     * @returns {boolean} true if all options matched
     */
    matchesRuleDefinition (rule, type, requestData) {
        const ruleDefinition = rule[type]
        if (!ruleDefinition) {
            return false
        }

        const matchTypes = (ruleDefinition.types && ruleDefinition.types.length)
            ? ruleDefinition.types.includes(requestData.request.type)
            : true

        const matchDomains = (ruleDefinition.domains && ruleDefinition.domains.length)
            ? ruleDefinition.domains.some(domain => domain.match(requestData.siteDomain))
            : true

        return (matchTypes && matchDomains)
    }

    /**
     * @param {{
     *     sameEntity: boolean,
     *     matchedRule: TrackerRule | null,
     *     matchedRuleException: boolean,
     *     defaultAction: ActionName | undefined,
     *     redirectUrl: string | boolean
     * }} tracker
     * @returns {{ action: ActionName, reason: string }}
     */
    getAction (tracker) {
        // Determine the blocking decision and reason.
        /** @type {ActionName | undefined} */
        let action = 'ignore'
        let reason = 'unknown fallback'

        if (tracker.sameEntity) {
            action = 'ignore'
            reason = 'first party'
        } else if (tracker.matchedRuleException) {
            action = 'ignore'
            reason = 'matched rule - exception'
        } else if (!tracker.matchedRule && tracker.defaultAction === 'ignore') {
            action = 'ignore'
            reason = 'default ignore'
        } else if (tracker.matchedRule && tracker.matchedRule.action === 'ignore') {
            action = 'ignore'
            reason = 'matched rule - ignore'
        } else if (!tracker.matchedRule && tracker.defaultAction === 'block') {
            action = 'block'
            reason = 'default block'
        } else if (tracker.matchedRule) {
            if (tracker.redirectUrl) {
                action = 'redirect'
                reason = 'matched rule - surrogate'
            } else {
                action = 'block'
                reason = 'matched rule - block'
            }
        }

        return { action, reason }
    }
}

module.exports = Trackers
