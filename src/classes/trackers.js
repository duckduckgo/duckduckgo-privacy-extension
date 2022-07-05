/**
 * @typedef TrackerData
 * @property {string | null | undefined} action
 * @property {string | undefined} reason
 * @property {boolean} firstParty
 * @property {string} redirectUrl
 * @property {*} matchedRule
 * @property {*} matchedRuleException
 * @property {TrackerObj} [tracker]
 * @property {string} fullTrackerDomain
 * @property {string | undefined} fromCname
 */

/**
 * @typedef TrackerRule
 * @property {string} rule
 * @property {number} fingerprinting
 * @property {number} cookies
 * @property {*} exceptions
 * @property {*} [options]
 */

/**
 * @typedef OwnerData
 * @property {string} name
 * @property {string} displayName
 */

/**
 * @typedef TrackerObj
 * @property {string} domain
 * @property {OwnerData} owner
 * @property {number} prevalence
 * @property {number} fingerprinting
 * @property {number} cookies
 * @property {string[]} categories
 * @property {string | null} default
 * @property {TrackerRule[]} rules
 */

/**
 * @typedef RequestData
 * @property {string} siteUrl
 * @property {RequestExpression} request
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

class Trackers {
    constructor (ops) {
        this.tldjs = ops.tldjs
        this.utils = ops.utils
    }

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

    processEntityList (data) {
        const processed = {}
        for (const entity in data) {
            data[entity].domains.forEach(domain => {
                processed[domain] = entity
            })
        }
        return processed
    }

    processSurrogateList (text) {
        const b64dataheader = 'data:application/javascript;base64,'
        const surrogateList = {}
        const splitSurrogateList = text.trim().split('\n\n')

        splitSurrogateList.forEach(sur => {
            // remove comment lines
            const lines = sur.split('\n').filter((line) => {
                return !(/^#.*/).test(line)
            })

            // remove first line, store it
            const firstLine = lines.shift()

            // take identifier from first line
            const pattern = firstLine.split(' ')[0].split('/')[1]
            const b64surrogate = Buffer.from(lines.join('\n').toString(), 'binary').toString('base64')
            surrogateList[pattern] = b64dataheader + b64surrogate
        })
        return surrogateList
    }

    /**
     * @param {string} url
     * @returns {{fromCname: string, finalURL: string}}
     */
    resolveCname (url) {
        const parsed = this.tldjs.parse(url)
        let finalURL = url
        let fromCname
        if (parsed && this.cnames) {
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
     * single object with all of our request and site data split and
     * processed into the correct format for the tracker set/get functions.
     * This avoids repeat calls to split and util functions.
     * @param {string} urlToCheck
     * @param {string} siteUrl
     * @param {RequestExpression} request
     * @returns {RequestData}
     */
    getRequestData (urlToCheck, siteUrl, request) {
        return {
            siteUrl: siteUrl,
            request: request,
            siteDomain: this.tldjs.parse(siteUrl).domain,
            siteUrlSplit: this.utils.extractHostFromURL(siteUrl).split('.'),
            urlToCheck: urlToCheck,
            urlToCheckDomain: this.tldjs.parse(urlToCheck).domain,
            urlToCheckSplit: this.utils.extractHostFromURL(urlToCheck).split('.')
        }
    }

    /**
     * @param {string} urlToCheck
     * @param {string} siteUrl
     * @param {RequestExpression} request
     * @returns {TrackerData | null}
     */
    getTrackerData (urlToCheck, siteUrl, request) {
        if (!this.entityList || !this.trackerList) {
            throw new Error('tried to detect trackers before rules were loaded')
        }

        let fromCname
        const requestData = this.getRequestData(urlToCheck, siteUrl, request)
        const trackerOwner = this.findTrackerOwner(requestData.urlToCheckDomain)
        const websiteOwner = this.findWebsiteOwner(requestData)

        const firstParty = (trackerOwner && websiteOwner) ? trackerOwner === websiteOwner : requestData.siteDomain === requestData.urlToCheckDomain
        const fullTrackerDomain = requestData.urlToCheckSplit.join('.')

        // finds a tracker definition by iterating over the whole trackerList and finding the matching tracker.
        let tracker = this.findTracker(requestData)

        if (!tracker) {
            // if request doesn't have any rules associated with it, we should check if it's a CNAMEed tracker
            const cnameResolution = this.resolveCname(urlToCheck)
            fromCname = cnameResolution.fromCname
            const cnameRequestData = this.getRequestData(urlToCheck, siteUrl, request)
            tracker = this.findTracker(cnameRequestData)

            if (!tracker) {
                if (firstParty) {
                    return null
                }
                const owner = {
                    name: trackerOwner || requestData.urlToCheckDomain || 'unknown',
                    displayName: trackerOwner || requestData.urlToCheckDomain || 'Unknown'
                }
                const tracker = {
                    domain: fullTrackerDomain,
                    owner: owner,
                    prevalence: 0,
                    fingerprinting: 0,
                    cookies: 0,
                    categories: [],
                    default: null,
                    rules: []
                }
                return {
                    action: tracker.default,
                    reason: '',
                    firstParty,
                    redirectUrl: '',
                    matchedRule: '',
                    matchedRuleException: '',
                    tracker,
                    fullTrackerDomain,
                    fromCname
                }
            }
        }

        // finds a matching rule by iterating over the rules in tracker.data and sets redirectUrl.
        const matchedRule = this.findRule(tracker, requestData)

        // @ts-ignore
        const redirectUrl = (matchedRule && matchedRule.surrogate) ? this.surrogateList[matchedRule.surrogate] : false

        // sets tracker.exception by looking at tracker.rule exceptions (if any)
        const matchedRuleException = matchedRule ? this.matchesRuleDefinition(matchedRule, 'exceptions', requestData) : false

        const { action, reason } = this.getAction({
            firstParty,
            matchedRule,
            matchedRuleException,
            defaultAction: tracker.default,
            redirectUrl
        })
        return {
            action,
            reason,
            firstParty,
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
     * @param {RequestData} requestData
     * @returns {undefined | TrackerObj}
     */
    findTracker (requestData) {
        const urlList = Array.from(requestData.urlToCheckSplit)
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
     * @param {RequestData} requestData
     * @returns {string | undefined}
     */
    findWebsiteOwner (requestData) {
        // find the site owner
        const siteUrlList = Array.from(requestData.siteUrlSplit)

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
     * Iterate through a tracker rule list and return the first matching rule, if any.
     * @param {TrackerObj} tracker
     * @param {RequestData} requestData
     * @returns {TrackerRule | null}
     */
    findRule (tracker, requestData) {
        let matchedRule = null
        // Find a matching rule from this tracker
        if (tracker.rules && tracker.rules.length) {
            tracker.rules.some(ruleObj => {
                if (this.requestMatchesRule(requestData, ruleObj)) {
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
     * return: true (all options matched)
     * @param {TrackerRule} rule
     * @param {string} type
     * @param {RequestData} requestData
     * @returns {boolean}
     */
    matchesRuleDefinition (rule, type, requestData) {
        if (!rule[type]) {
            return false
        }

        const ruleDefinition = rule[type]

        const matchTypes = (ruleDefinition.types && ruleDefinition.types.length)
            ? ruleDefinition.types.includes(requestData.request.type)
            : true

        const matchDomains = (ruleDefinition.domains && ruleDefinition.domains.length)
            ? ruleDefinition.domains.some(domain => domain.match(requestData.siteDomain))
            : true

        return (matchTypes && matchDomains)
    }

    getAction (tracker) {
        // Determine the blocking decision and reason.
        let action, reason
        if (tracker.firstParty) {
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
