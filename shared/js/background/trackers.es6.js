const tldjs = require('tldjs')
const settings = require('./settings.es6')
const surrogates = require('./surrogates.es6')
const constants = require('../../data/constants')
const utils = require('./utils.es6')
const entityMap = require('../../data/tracker_lists/entityMap')

class Trackers {
    constructor () {
        this.entityList = {}
        this.trackersWithParentCompany = {}
        this.isReady = false
    }

    setLists (lists) {
        lists.forEach(list => {
            if (list.name === 'trackersWithParentCompany') {
                this[list.name] = this.processTrackerList(list)
            } else {
                this[list.name] = list
            }
        })

        this.isReady = true
        console.log('Trackers: ready to block')
    }

    // compile regex entries in the tracker list
    processTrackerList (data) {
        Object.keys(data).forEach(categoryName => {
            let category = data[categoryName]

            Object.keys(category).forEach(trackerName => {
                let tracker = category[trackerName]
                // Look for regex rules and pre-compile to speed up the blocking algo later on
                if (tracker.rules) {
                    for (let i in tracker.rules) {
                        // All of our rules are host anchored and have an implied wildcard at the end.
                        tracker.rules[i].rule = new RegExp(tracker.rules[i].rule + '.*', 'i')
                    }
                }

                if (tracker.whitelist) {
                    for (let i in tracker.whitelist) {
                        // All of our rules are host anchored and have an implied wildcard at the end.
                        tracker.whitelist[i].rule = new RegExp(tracker.whitelist[i].rule + '.*', 'i')
                    }
                }
            })
        })
        return data
    }

    /*
    * The main parts of the isTracker algo looks like this:
    * 1. Is this a tracker
    *     - a quick check for embedded twitter trackers
    *     - a longer check through our blocklist
    * 2. If a tracker was found in 1
    *     - see if we have surrogate JS for this tracker, set redirectUrl
    *     - see if we have a whitelist entry, set block=false
    * 3. Check to see if the tracker is first party or owned by the current
    *    site's parent company. If this is the case we mark the tracker as
    *    'first party' for transparency but don't block.
    * 4. Return a standard tracker object that includes the block decision,
    *    info about the tracker, and surrogate JS
    */
    isTracker (urlToCheck, thisTab, request) {
        if (!this.isReady) {
            console.log('Trackers: not ready to block')
            return false
        }

        const currLocation = thisTab.url || ''
        const siteDomain = thisTab.site ? thisTab.site.domain : ''
        if (!siteDomain || !settings.getSetting('trackerBlockingEnabled')) return

        let embeddedTweets = this.checkEmbeddedTweets(urlToCheck, settings.getSetting('embeddedTweetsEnabled'))
        if (embeddedTweets) {
            return this.checkFirstParty(embeddedTweets, currLocation, urlToCheck)
        }

        const parsedUrl = tldjs.parse(urlToCheck)
        const urlSplit = this.getSplitURL(parsedUrl, urlToCheck)
        let trackerByParentCompany = this.checkTrackersWithParentCompany(urlSplit, siteDomain, request)
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
        trackerObj.reason = 'first party'
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
        let matchedTracker = false

        // base case
        if (url.length < 2) { return false }

        let trackerURL = url.join('.')

        constants.blocking.some(function (trackerType) {
            // Some trackers are listed under just the host name of their parent company without
            // any subdomain. Ex: ssl.google-analytics.com would be listed under just google-analytics.com.
            // Other trackers are listed using their subdomains. Ex: developers.google.com.
            // We'll start by checking the full host with subdomains and then if no match is found
            // try pulling off the subdomain and checking again.
            if (!this.trackersWithParentCompany[trackerType]) return
            const tracker = this.trackersWithParentCompany[trackerType][trackerURL]
            if (!tracker) return

            // Check to see if this request matches any of the blocking rules for this tracker
            if (tracker.rules && tracker.rules.length) {
                tracker.rules.some(ruleObj => {
                    if (this.requestMatchesRule(request, ruleObj, siteDomain)) {
                        matchedTracker = {data: tracker, rule: ruleObj.rule, type: trackerType, block: true}
                        // break loop early
                        return true
                    }
                })
            } else {
                // no rules so we always block this tracker
                matchedTracker = {data: tracker, type: trackerType, block: true}
                return true
            }
        }, this)

        if (matchedTracker) {
            if (matchedTracker.data.whitelist) {
                const foundOnWhitelist = matchedTracker.data.whitelist.some(ruleObj => {
                    if (this.requestMatchesRule(request, ruleObj, siteDomain)) {
                        matchedTracker.block = false
                        matchedTracker.type = 'trackersWhitelist'
                        // break loop early
                        return true
                    }
                })

                if (foundOnWhitelist) {
                    return this.getReturnTrackerObj(matchedTracker, request, 'whitelisted')
                }
            }
            return this.getReturnTrackerObj(matchedTracker, request, 'trackersWithParentCompany')
        } else {
            // remove the subdomain and recheck for trackers. This is recursive, we'll continue
            // to pull off subdomains until we either find a match or have no url to check.
            // Ex: x.y.z.analytics.com would be checked 4 times pulling off a subdomain each time.
            url.shift()
            return this.checkTrackersWithParentCompany(url, siteDomain, request)
        }
    }

    requestMatchesRule (request, ruleObj, siteDomain) {
        if (ruleObj.rule.exec(request.url)) {
            return this.matchRuleOptions(ruleObj, request, siteDomain)
        } else {
            return false
        }
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
    getReturnTrackerObj (tracker, request, reason) {
        if (!(tracker && tracker.data && (typeof tracker.block !== 'undefined'))) {
            console.warn('Missing correct tracker info to block')
            return false
        }

        let fullURL = request.url ? request.url : request
        return {
            parentCompany: tracker.data.c,
            url: utils.extractHostFromURL(fullURL),
            type: tracker.type,
            block: tracker.block,
            rule: tracker.data.rule || null,
            reason: reason,
            redirectUrl: tracker.redirectUrl || null
        }
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
