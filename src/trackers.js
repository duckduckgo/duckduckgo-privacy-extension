const utils = require('./utils')
const tldjs = require('tldjs')
const entityMap = require('../data/generated/entity-map')
const btoa = require('btoa')
const chalk = require('chalk')


class Trackers {
    addLists (lists) {
        this.entityList = this.processEntityList(lists.entityList)
        this.trackerList = this.processTrackerList(lists.trackerList)
        this.surrogateList = this.processSurrogateList(lists.surrogates)
        this.exceptionTypes = ['domains', 'types']

        console.log(Object.keys(this.surrogateList))
    }

    processTrackerList (data) {
        Object.keys(data).forEach(name => {
            if (data[name].rules) {
                for (let i in data[name].rules) {
                    // fix this later. make a toString to serialize RegExp?
                    data[name].rules[i].ruleStr = data[name].rules[i].rule
                    data[name].rules[i].rule = new RegExp(data[name].rules[i].rule, 'ig')
                }
            }
        })
        return data
    }

    processEntityList (data) {
        let processed = {}
        Object.keys(data).forEach(entity => {
            data[entity].properties.forEach(domain => {
                processed[domain] = entity
            })
        })
        return processed
    }

    processSurrogateList (text) {
        const b64dataheader = 'data:application/javascript;base64,'
        let surrogateList = {}
        let splitSurrogateList = text.trim().split('\n\n')

        splitSurrogateList.forEach(sur => {
            // remove comment lines
            let lines = sur.split('\n').filter((line) => {
                return !(/^#.*/).test(line)
            })

            // remove first line, store it
            let firstLine = lines.shift()

            // take identifier from first line
            let pattern = firstLine.split(' ')[0]
            let b64surrogate = btoa(lines.join('\n'))
            surrogateList[pattern] = b64dataheader + b64surrogate
        })
        return surrogateList
    }

    isTracker (urlToCheck, siteUrl, request, ops) {
        return this.getTrackerData(urlToCheck, siteUrl, request, ops)
    }

    getTrackerData (urlToCheck, siteUrl, request, ops) {
        ops = ops || {}
        
        if (!this.entityList || !this.trackerList) {
            throw new Error('tried to detect trackers before rules were loaded')
        }

        // single object with all of our requeest and site data split and 
        // processed into the correct format for the tracker set/get functions. 
        // This avoids repeat calls to split and util functions.
        const requestData = {
            ops: ops,
            siteUrl: siteUrl, 
            request: request,
            siteDomain: tldjs.parse(siteUrl).domain,
            siteUrlSplit: utils.extractHostFromURL(siteUrl).split('.'),
            urlToCheck: urlToCheck,
            urlToCheckDomain: tldjs.parse(urlToCheck).domain,
            urlToCheckSplit: utils.extractHostFromURL(urlToCheck).split('.')
        }

        // tracker object returned by getTrackerData
        const tracker = {
            definition: null,
            action: false,
            redirectUrl: null,
            owner: null,
            firstParty: false,
            matchedRule: null,
            matchedRuleException: false
        }

        // finds a tracker definition by iterating over the whole trackerList and finding the matching tracker.
        tracker.definition = this.findTracker(tracker, requestData)

        if (!tracker.definition) {
            return null
        }

        // finds a matching rule by iterating over the rules in tracker.data and sets redirectUrl.
        tracker.matchedRule = this.findRule(tracker, requestData)

        // sets tracker.exception by looking at tracker.rule exceptions (if any)
        tracker.matchedRuleException = this.matchesException(tracker, requestData)

        // compare the site owner to the tracker owner and set firstParty
        tracker.firstParty = this.setFirstParty(tracker, requestData)

        this.setAction(tracker, requestData)

        return tracker
    }

    /*
     * Pull subdomains off of the reqeust rule and look for a matching tracker object in our data
     */
    findTracker (tracker, requestData) {
        let urlList = Object.assign([], requestData.urlToCheckSplit)

        while (urlList.length > 1) {
            let trackerDomain = urlList.join('.')
            urlList.shift()

            const matchedTracker = this.trackerList[trackerDomain]
            if (matchedTracker) {
                return matchedTracker
            }
        }
        return
    }

    /*
    * Set parent and first party values on tracker
    */
    setFirstParty (tracker, requestData) {

        // find the owner of the tracker
        let owner = this.entityList[requestData.urlToCheckDomain]
        tracker.owner = owner

        // find the site owner
        let siteUrlList = Object.assign([], requestData.siteUrlSplit)
        let matchedEntity = ''

        while (siteUrlList.length > 1) {
            let siteToCheck = siteUrlList.join('.')
            siteUrlList.shift()

            matchedEntity = this.entityList[siteToCheck]
            if (matchedEntity) {
                break
            }
        }

        if (matchedEntity && matchedEntity === owner) {
            return true
        }
        return false
    }

    /*
     * Iterate through a tracker rule list and return the first matching rule, if any.
     */
    findRule(tracker, requestData) {
        let matchedRule = null
        // Find a matching rule from this tracker
        if (tracker.definition.rules && tracker.definition.rules.length) {
            tracker.definition.rules.some(ruleObj => {
                if (this.requestMatchesRule(requestData, ruleObj)) {
                    return matchedRule = ruleObj
                }
            })
        }

        // look up surrogate
        if (matchedRule && matchedRule.surrogate) {
            tracker.redirectUrl = this.surrogateList[matchedRule.surrogate]
        } 
        return matchedRule
    }

    requestMatchesRule (requestData, ruleObj) {
        if (!!requestData.urlToCheck.match(ruleObj.rule)) {
            return this.matchRuleOptions(ruleObj, requestData)
        } else {
            return false
        }
    }

    /* Check the matched rule exceptions against the request data
     * Both domains and types need to match (if they exist) in order
     * for the exception to match.
    */
    matchesException (tracker, requestData) {
        if (tracker.matchedRule && tracker.matchedRule.exceptions) {
            // all exception types need to match for this to return true
            return !this.exceptionTypes.some(exceptionType => {
                const requestParamToCheck = exceptionType === 'domains' ? requestData.siteDomain : requestData.request.type
                return !(tracker.matchedRule.exceptions[exceptionType] &&
                          tracker.matchedRule.exceptions[exceptionType].length &&
                          tracker.matchedRule.exceptions[exceptionType].includes(requestParamToCheck))
            })
        } else {
            return false
        }
    }

    /* Check the matched rule  options against the request data
    *  return: true (all options matched)
    */
    matchRuleOptions (rule, requestData) {
        if (!rule.options) return true

        if (rule.options.types && 
            rule.options.types.length && 
            !rule.options.types.includes(requestData.request.type)) {
            return false
        }

        if (rule.options.domains && 
            rule.options.domains.length && 
            !rule.options.domains.includes(requestData.siteDomain)) {
            return false
        }

        return true
    }

    setAction (tracker, requestData) {
        // Determine the blocking decision and reason. 
        if (tracker.firstParty) {
            tracker.action = 'ignore'
            tracker.reason = 'first party'
        }
        else if (tracker.matchedRuleException) {
            tracker.action = 'ignore'
            tracker.reason = 'exception'
        } else if (!tracker.matchedRule && tracker.definition.default === 'ignore') {
            tracker.action = 'ignore'
            tracker.reason = 'tracker set to ignore'
        } else if (tracker.matchedRule && tracker.matchedRule.action === 'ignore') {
            tracker.action = 'ignore'
            tracker.reason = 'rule action ignore'
        } else if (!tracker.matchedRule && tracker.definition.default === 'block') {
            tracker.action = 'block'
            tracker.reason = 'tracker set to default block'
        } else if (tracker.matchedRule){
            if (tracker.redirectUrl) {
                tracker.action = 'redirect'
            } else {
                tracker.action = 'block'
            }
            tracker.reason = 'matched rule'
        } else {
            return false
        }
    }
}

module.exports = new Trackers()
