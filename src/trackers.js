const utils = require('./utils')
const tldjs = require('tldjs')
const entityMap = require('../data/generated/entity-map')
const surrogates = require('./surrogates')
const chalk = require('chalk')


class Trackers {
    addLists (lists) {
        this.entityList = lists.entityList
        this.trackerList = this.processTrackerList(lists.trackerList)
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

    getTrackerData (urlToCheck, siteUrl, request, ops) {
        ops = ops || {}
        
        if (!this.entityList || !this.trackerList) {
            throw new Error('tried to detect trackers before rules were loaded')
        }

        const tracker = {
            data: null,
            block: false,
            surrogate: null,
            owner: null
            firstParty: false,
            rule: null,
            exception: false
        }

        // sets tracker.data
        this.findTracker(tracker, urlToCheck)

        if (!tracker.data) {
            return false
        }

        // sets tracker.rule
        this.findRule(tracker, siteUrl, request)

        // sets tracker.exception
        this.matchesException(tracker, siteUrl, request)
        
        // sets tracker.surrogate
        this.findSurrogate(tracker)

        // sets tracker.owner and tracker.firstParty
        this.findOwner(tracker)

        // sets tracker.block
        this.setBlockDecision(tracker)

        return tracker
    }

    /*
     * Pull subdomains off of the reqeust rule and look for a matching tracker object in our data
     */
    findTracker (urlToCheck) {
        let urlList = urlToCheck.split('.')

        while (urlList.length > 1) {
            let trackerDomain = urlList.join('.')
            urlList.shift()

            const matchedTracker = this.trackerList[trackerDomain]
            if (matchedTracker) {
                tracker.data = matchedTracker
            }
        }
    }

    /*
    * Set parent and first party values on tracker
    */
    setParent(tracker, currLocation, urlToCheck) {
        let commonParent = this.getCommonParentEntity(currLocation, urlToCheck)
        if (commonParent) {
            tracker.parent = commoonParent
            tracker.firstParty = true
        }
        return 
    }

    /*
     * Iterate through a tracker rule list and return the first matching rule, if any.
     */
    setMatchingRule(tracker) {
        let matchedRule = false
        // Find a matching rule from this tracker
        if (tracker.rules && tracker.rules.length) {
            tracker.rules.some(ruleObj => {
                return matchedRule = this.requestMatchesRule(request, ruleObj, siteDomain)
            })
        }
        tracker.rule = matchedRule
        return
    }

    requestMatchesRule (request, ruleObj, siteDomain) {
        if (!!request.url.match(ruleObj.rule)) {
            return this.matchRuleOptions(ruleObj, request, siteDomain)
        } else {
            return false
        }
    }

    /* Check the matched rule exceptions against the request data
    *  return: false (not whitelisted), true (whitelisted)
    */
    setMatchingException (tracker, request, siteDomain) {
        if (tracker.rule && tracker.rule.exceptions) {
            if (tracker.rule.exceptions.types &&
                tracker.rule.exceptions.types.length && 
                !tracker.rule.exceptions.types.includes(request.type)) {
                tracker.exception = 'request-type'
                return
            }

            if (tracker.rule.exceptions.domains && 
                tracker.rule.exceptions.domains.length && 
                !tracker.rule.exceptions.domains.includes(siteDomain)) {
                tracker.exception = 'site'
                return
            }
        }
        return
    }

    /* Check the matched rule  options against the request data
    *  return: true (all options matched)
    */
    matchRuleOptions (rule, request, siteDomain) {
        if (!rule.options) return true

        if (rule.options.types && 
            rule.options.types.length && 
            !rule.options.types.includes(request.type)) {
            return false
        }

        if (rule.options.domains && 
            rule.options.domains.length && 
            !rule.options.domains.includes(siteDomain)) {
            return false
        }

        return true
    }

    getBlockingDecision (tracker) {
        // Determine the blocking decision and reason. 
        // 1. check for exceptions -> don't block
        // 2. no matching rule and default ignore -> don't block
        // 3. matched a rule but the rule has action ignore -> don't block
        // 4. no rules and default block -> block
        // 5. matches rule -> block
        if (this.matchesExceptions(matchedTracker, request, siteDomain)) {
            matchedTracker.block = false
            matchedTracker.reason = 'exception'
        } else if (!matchedTracker.rule && matchedTracker.data.default === 'ignore') {
            matchedTracker.block = false
            matchedTracker.reason = 'ignore'
        } else if (matchedTracker.rule && matchedTracker.rule.action === 'ignore') {
            matchedTracker.block = false
            matchedTracker.reason = 'action ignore'
        } else if (!matchedTracker.rule && matchedTracker.data.default === 'block') {
            matchedTracker.block = true
            matchedTracker.reason = 'default'
        } else if (matchedTracker.rule){
            matchedTracker.block = true
            matchedTracker.reason = 'rule'
        } else {
            // what could fall through here?
            return false
        }

        return this.getReturnTrackerObj(matchedTracker, request)
    }

    /*
    * Check to see if this tracker is related to the current page through their parent companies
    * Only block request to 3rd parties
    */
    isRelatedEntity (parentCompany, requestDetails) {
        var parentEntity = this.entityList[parentCompany]

        if (parentEntity && parentEntity.regexProperties) {
            if (requestDetails.siteUrl.match(parentEntity.regexProperties)) {
                return true
            }
        }
        return false
    }

    /* 
    * Compare two urls to determine if they came from the same hostname
    * pull off any subdomains before comparison.
    * Return parent company name from entityMap if one is found or unknown
    * if domains match but we don't have this site in our entityMap.
    */
    getCommonParentEntity (currLocation, urlToCheck) {
        if (!entityMap) return
        let currentLocationParsed = tldjs.parse(currLocation)
        let urlToCheckParsed = tldjs.parse(urlToCheck)
        let parentEntity = entityMap[urlToCheckParsed.domain]
        if (currentLocationParsed.domain === urlToCheckParsed.domain ||
            this.isRelatedEntity(parentEntity, currLocation)) { return parentEntity || currentLocationParsed.domain }

        return false
    }

    /*
    * If element hiding is enabled on current domain, send messages
    * to content scripts to start the process of hiding blocked ads
    */
    tryElementHide (requestData, tab) {
        if (tab.parentEntity === 'Oath') {
            let frameId, messageType
            if (requestData.type === 'sub_frame') {
                frameId = requestData.parentFrameId
                messageType = frameId === 0 ? 'blockedFrame' : 'blockedFrameAsset'
            } else if (requestData.frameId !== 0 && (requestData.type === 'image' || requestData.type === 'script')) {
                frameId = requestData.frameId
                messageType = 'blockedFrameAsset'
            }
            chrome.tabs.sendMessage(requestData.tabId, {type: messageType, request: requestData, mainFrameUrl: tab.url}, {frameId: frameId})
        } else if (!tab.elementHidingDisabled) {
            chrome.tabs.sendMessage(requestData.tabId, {type: 'disable'})
            tab.elementHidingDisabled = true
        }
    }
}

module.exports = new Trackers()
