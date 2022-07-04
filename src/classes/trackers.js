(function () {
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

        getTrackerData (urlToCheck, siteUrl, request, ops) {
            ops = ops || {}

            if (!this.entityList || !this.trackerList) {
                throw new Error('tried to detect trackers before rules were loaded')
            }

            let fromCname

            // single object with all of our requeest and site data split and
            // processed into the correct format for the tracker set/get functions.
            // This avoids repeat calls to split and util functions.
            const requestData = {
                ops: ops,
                siteUrl: siteUrl,
                request: request,
                siteDomain: this.tldjs.parse(siteUrl).domain,
                siteUrlSplit: this.utils.extractHostFromURL(siteUrl).split('.'),
                urlToCheck: urlToCheck,
                urlToCheckDomain: this.tldjs.parse(urlToCheck).domain,
                urlToCheckSplit: this.utils.extractHostFromURL(urlToCheck).split('.')
            }

            // finds a tracker definition by iterating over the whole trackerList and finding the matching tracker.
            let tracker = this.findTracker(requestData)

            if (!tracker) {
                // if request doesn't have any rules associated with it, we should check if it's a CNAMEed tracker
                const cnameResolution = this.resolveCname(urlToCheck)
                fromCname = cnameResolution.fromCname
                urlToCheck = cnameResolution.finalURL

                requestData.urlToCheck = urlToCheck
                requestData.urlToCheckDomain = this.tldjs.parse(urlToCheck).domain
                requestData.urlToCheckSplit = this.utils.extractHostFromURL(urlToCheck).split('.')
                tracker = this.findTracker(requestData)

                if (!tracker) {
                    return null
                }
            }

            // finds a matching rule by iterating over the rules in tracker.data and sets redirectUrl.
            const matchedRule = this.findRule(tracker, requestData)

            const redirectUrl = (matchedRule && matchedRule.surrogate) ? this.surrogateList[matchedRule.surrogate] : false

            // sets tracker.exception by looking at tracker.rule exceptions (if any)
            const matchedRuleException = matchedRule ? this.matchesRuleDefinition(matchedRule, 'exceptions', requestData) : false

            const trackerOwner = this.findTrackerOwner(requestData.urlToCheckDomain)

            const websiteOwner = this.findWebsiteOwner(requestData)

            const firstParty = (trackerOwner && websiteOwner) ? trackerOwner === websiteOwner : false

            const fullTrackerDomain = requestData.urlToCheckSplit.join('.')

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

        /*
         * Pull subdomains off of the reqeust rule and look for a matching tracker object in our data
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

        findTrackerOwner (trackerDomain) {
            return this.entityList[trackerDomain]
        }

        /*
        * Set parent and first party values on tracker
        */
        findWebsiteOwner (requestData) {
            // find the site owner
            const siteUrlList = Array.from(requestData.siteUrlSplit)

            while (siteUrlList.length > 1) {
                const siteToCheck = siteUrlList.join('.')
                siteUrlList.shift()

                if (this.entityList[siteToCheck]) {
                    return this.entityList[siteToCheck]
                }
            }
        }

        /*
         * Iterate through a tracker rule list and return the first matching rule, if any.
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

        /* Check the matched rule  options against the request data
        *  return: true (all options matched)
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

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = Trackers
    } else {
        window.Trackers = Trackers
    }
})()
