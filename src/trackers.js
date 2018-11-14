const utils = require('./utils')
const tldjs = require('tldjs')
const entityMap = require('../data/generated/entity-map')
const surrogates = require('./surrogates')

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

    isTracker (urlToCheck, currLocation, request, ops) {
        ops = ops || {}

        if (!this.entityList || !this.trackerList) {
            throw new Error('tried to detect trackers before rules were loaded')
        }

        let currLocationDomain = utils.getDomain(currLocation)
        let hostnameToCheck = utils.extractHostFromURL(urlToCheck)
        let parsedUrl = { domain: utils.getDomain(urlToCheck) }

        if (!hostnameToCheck) {
            return false
        }

        let urlSplit = hostnameToCheck.split('.')

        let embeddedTweets = this.checkEmbeddedTweets(urlToCheck, ops.embeddedTweetsEnabled)
        if (embeddedTweets) {
            return this.checkFirstParty(embeddedTweets, currLocation, urlToCheck)
        }

        let trackerByParentCompany = this.checkTrackersWithParentCompany(urlSplit, currLocationDomain, request)
        if (trackerByParentCompany) {
            // if we have a match, check to see if we have surrogate JS for this tracker
            trackerByParentCompany.redirectUrl = surrogates.getContentForUrl(urlToCheck, parsedUrl)
            return this.checkFirstParty(trackerByParentCompany, currLocation, urlToCheck)
        }
        return false
    }

    // return a hostname split on '.'
    getSplitURL (parsedUrl, urlToCheck) {
        let hostname = ''

        if (parsedUrl && parsedUrl.hostname) {
            hostname = parsedUrl.hostname
        } else {
            // fail gracefully if tldjs chokes on the URL e.g. it doesn't parse
            // if the subdomain name has underscores in it
            try {
                // last ditch attempt to try and grab a hostname
                // this will fail on more complicated URLs with e.g. ports
                // but will allow us to block simple trackers with _ in the subdomains
                hostname = urlToCheck.match(/^(?:.*:\/\/)([^/]+)/)[1]
            } catch (e) {
                // give up
                return false
            }
        }
        return hostname.split('.')
    }

    /*
    * Check current location and tracker url to determine if they are first-party
    * or related entities. Sets block status to 'false' if they are first-party
    */
    checkFirstParty (returnObj, currLocation, urlToCheck) {
        let commonParent = this.getCommonParentEntity(currLocation, urlToCheck)
        if (commonParent) {
            return this.addCommonParent(returnObj, commonParent)
        }
        return returnObj
    }

    // add common parent info to the final tracker object returned by isTracker
    addCommonParent (trackerObj, parentName) {
        trackerObj.parentCompany = parentName
        trackerObj.block = false
        trackerObj.reason = `${trackerObj.reason} - first party`
        return trackerObj
    }

    checkEmbeddedTweets (urlToCheck, embeddedOn) {
        if (!embeddedOn && /platform.twitter.com/.test(urlToCheck)) {
            console.log('blocking tweet embedded code on ' + urlToCheck)
            return {parentCompany: 'Twitter', url: 'platform.twitter.com', type: 'Analytics', block: true}
        }
        return false
    }

    checkTrackersWithParentCompany (url, siteDomain, request) {
        let matchedTracker = ''

        // find the matching tracker object
        while (url.length > 1) {
            let trackerURL = url.join('.')
            url.shift()

            // Some trackers are listed under just the host name of their parent company without
            // any subdomain. Ex: ssl.google-analytics.com would be listed under just google-analytics.com.
            // Other trackers are listed using their subdomains. Ex: developers.google.com.
            // We'll start by checking the full host with subdomains and then if no match is found
            // try pulling off the subdomain and checking again.
            const tracker = this.trackerList[trackerURL]
            if (!tracker) continue

            matchedTracker = {data: tracker}
            break
        }

        if (!matchedTracker) return

        // Find a matching rule from this tracker
        if (matchedTracker.data.rules && matchedTracker.data.rules.length) {
            matchedTracker.data.rules.some(ruleObj => {
                if (this.requestMatchesRule(request, ruleObj, siteDomain)) {
                    matchedTracker.rule = ruleObj
                    return true
                }
            })
        }

        // Determine the blocking decision and reason. 
        // 1. check for exceptions -> don't block
        // 2. no matching rule and default ignore -> don't block
        // 3. no rules and default block -> block
        // 4. matches rule -> block
        if (this.matchesExceptions(matchedTracker, request, siteDomain)) {
            matchedTracker.block = false
            matchedTracker.reason = 'exception'
        } else if (!matchedTracker.rule && matchedTracker.data.default === 'ignore') {
            matchedTracker.block = false
            matchedTracker.reason = 'ignore'
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

    requestMatchesRule (request, ruleObj, siteDomain) {
        if (ruleObj.rule.exec(request.url)) {
            return this.matchRuleOptions(ruleObj, request, siteDomain)
        } else {
            return false
        }
    }


    /* Check the matched rule exceptions against the request data
    * return: false (not whitelisted), true (whitelisted)
    */
    matchesExceptions (tracker, request, siteDomain) {
        if (tracker.rule && tracker.rule.exceptions) {
            if (tracker.rule.exceptions.types &&
                tracker.rule.exceptions.types.length && 
                !tracker.rule.exceptions.types.includes(request.type)) {
                return false
            }

            if (tracker.rule.exceptions.domains && 
                tracker.rule.exceptions.domains.length && 
                !tracker.rule.exceptions.domains.includes(siteDomain)) {
                return false
            }
            // passed domain and type checks
            return true
        }
        return false
    }

    /* Check the matched rule  options against the request data
    * return: true (all options matched)
    */
    matchRuleOptions (rule, request, siteDomain) {
        if (!rule.options) return true

        if (rule.options.types && rule.options.types.length && !rule.options.types.includes(request.type)) {
            return false
        }

        if (rule.options.domains && rule.options.domains.length && !rule.options.domains.includes(siteDomain)) {
            return false
        }

        return true
    }

    /* Check the matched rule  options against the request data
    * return: true (all options matched)
    */
    matchRuleOptions (rule, request, siteDomain) {
        if (!rule.options) return true

        if (rule.options.types && rule.options.types.length && !rule.options.types.includes(request.type)) {
            return false
        }

        if (rule.options.domains && rule.options.domains.length && !rule.options.domains.includes(siteDomain)) {
            return false
        }

        return true
    }

    // isTracker return object. Takes either surrogate or tracker info
    // and returns a common data sturucture
    getReturnTrackerObj (tracker, request) {
        if (!(tracker && tracker.data && (typeof tracker.block !== 'undefined'))) {
            console.warn('Missing correct tracker info to block')
            return false
        }

        if (tracker.default === 'ignore' && tracker.block === 'false') {
            return false
        }

        let result = {
            parentCompany: tracker.data.owner.name,
            url: utils.extractHostFromURL(request.url),
            requestUrl: request.url,
            type: tracker.type,
            block: tracker.block,
            reason: tracker.reason,
            redirectUrl: tracker.redirectUrl || null
        }
        tracker.rule ? result.rule = tracker.rule.ruleStr : null
        return result
    }

    /* Check to see if this tracker is related to the current page through their parent companies
    * Only block request to 3rd parties
    */
    isRelatedEntity (parentCompany, currLocation) {
        var parentEntity = this.entityList[parentCompany]
        var host = utils.extractHostFromURL(currLocation)

        if (parentEntity && parentEntity.properties) {
        // join parent entities to use as regex and store in parentEntity so we don't have to do this again
            if (!parentEntity.regexProperties) {
                parentEntity.regexProperties = parentEntity.properties.join('|')
            }

            if (host.match(parentEntity.regexProperties)) {
                return true
            }
        }

        return false
    }

    /* Compare two urls to determine if they came from the same hostname
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
