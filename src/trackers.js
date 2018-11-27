const utils = require('./utils')
const tldjs = require('tldjs')
const entityMap = require('../data/generated/entity-map')
const surrogates = require('./surrogates')
const chalk = require('chalk')


class Trackers {
    addLists (lists) {
        this.entityList = this.processEntityList(lists.entityList)
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

    processEntityList(data) {
        let processed = {}
        Object.keys(data).forEach(entity => {
            data[entity].properties.forEach(domain => {
                processed[domain] = entity
            })
        })
        return processed
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
            data: null,
            block: false,
            redirectUrl: null,
            owner: null,
            firstParty: false,
            rule: null,
            exception: false
        }

        // sets tracker.data
        this.findTracker(tracker, requestData)

        if (!tracker.data) {
            return false
        }

        // sets tracker.rule
        this.findRule(tracker, requestData)

        // sets tracker.exception
        this.matchesException(tracker, requestData)
        
        // sets tracker.redirectUrl
        this.findSurrogate(tracker, requestData)

        // sets tracker.firstParty
        this.setFirstParty(tracker, requestData)

        // sets tracker.block
        this.setBlockDecision(tracker, requestData)

        //console.log(chalk.blue(`Block: ${tracker.block}, reason: ${tracker.reason}, rule: ${JSON.stringify(tracker.rule)}, redirect: ${tracker.redirectUrl}`))
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
                tracker.data = matchedTracker
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
            tracker.firstParty = true
        }
        return
    }

    findSurrogate(tracker, requestData) {
        tracker.redirectUrl = surrogates.getContentForUrl(requestData.urlToCheck, requestData.urlToCheckDomain)
    }

    /*
     * Iterate through a tracker rule list and return the first matching rule, if any.
     */
    findRule(tracker, requestData) {
        // Find a matching rule from this tracker
        if (tracker.data.rules && tracker.data.rules.length) {
            tracker.data.rules.some(ruleObj => {
                if (this.requestMatchesRule(requestData, ruleObj)) {
                    tracker.rule = ruleObj
                    return true
                }
            })
        }
        return
    }

    requestMatchesRule (requestData, ruleObj) {
        if (!!requestData.urlToCheck.match(ruleObj.rule)) {
            return this.matchRuleOptions(ruleObj, requestData)
        } else {
            return false
        }
    }

    /* Check the matched rule exceptions against the request data
    *  return: false (not whitelisted), true (whitelisted)
    */
    matchesException (tracker, request, siteDomain) {
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

    setBlockDecision (tracker, requestData) {
        // Determine the blocking decision and reason. 
        if (tracker.firstParty) {
            tracker.block = false
            tracker.reason = 'first party'
        }
        else if (this.matchesException(tracker, requestData)) {
            tracker.block = false
            tracker.reason = 'exception'
        } else if (!tracker.rule && tracker.data.default === 'ignore') {
            tracker.block = false
            tracker.reason = 'ignore'
        } else if (tracker.rule && tracker.rule.action === 'ignore') {
            tracker.block = false
            tracker.reason = 'action ignore'
        } else if (!tracker.rule && tracker.data.default === 'block') {
            tracker.block = true
            tracker.reason = 'default'
        } else if (tracker.rule){
            tracker.block = true
            tracker.reason = 'rule'
        } else {
            // what could fall through here?
            return false
        }

        return
    }

    /*
    
    * If element hiding is enabled on current domain, send messages
    * to content scripts to start the process of hiding blocked ads
    
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
    */
}

module.exports = new Trackers()
