const abp = require('abp-filter-parser')
const tldjs = require('tldjs')

const load = require('./load.es6')
const settings = require('./settings.es6')
const surrogates = require('./surrogates.es6')
const trackerLists = require('./tracker-lists.es6').getLists()
const abpLists = require('./abp-lists.es6')
const constants = require('../../data/constants')
const utils = require('./utils.es6')
const entityMap = require('../../data/tracker_lists/entityMap')
const prevalence = require('../../data/tracker_lists/prevalence')

let entityList = {}

function loadLists () {
    load.JSONfromExternalFile(constants.entityList).then((response) => { entityList = response.data })
}

/*
 * The main parts of the isTracker algo looks like this:
 * 1. check the request against our own whitelist
 * 2. check the request against the trackersWithParentCompany list
 * 3. check the request against the easylists
 *
 * If a tracker is found in steps #2,3 we check it against getCommonParentEntity
 * to determine if this tracker is owned by the current site's parent company.
 * In this case we don't block the request but still return the tracker obj
 * for transparency.
 */
function isTracker (urlToCheck, thisTab, request) {
    let currLocation = thisTab.url || ''
    let siteDomain = thisTab.site ? thisTab.site.domain : ''
    if (!siteDomain) return

    // DEMO embedded tweet option
    // a more robust test for tweet code may need to be used besides just
    // blocking platform.twitter.com
    if (settings.getSetting('embeddedTweetsEnabled') === false) {
        if (/platform.twitter.com/.test(urlToCheck)) {
            console.log('blocking tweet embedded code on ' + urlToCheck)
            return {parentCompany: 'Twitter', url: 'platform.twitter.com', type: 'Analytics'}
        }
    }

    if (settings.getSetting('trackerBlockingEnabled')) {
        let parsedUrl = tldjs.parse(urlToCheck)
        let hostname

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

        let urlSplit = hostname.split('.')

        var whitelistedTracker = checkWhitelist(urlToCheck, siteDomain, request)
        if (whitelistedTracker) {
            let commonParent = getCommonParentEntity(currLocation, urlToCheck)
            if (commonParent) {
                return addCommonParent(whitelistedTracker, commonParent)
            }
            return whitelistedTracker
        }

        let surrogateTracker = checkSurrogateList(urlToCheck, parsedUrl, currLocation)
        if (surrogateTracker) {
            let commonParent = getCommonParentEntity(currLocation, urlToCheck)
            if (commonParent) {
                return addCommonParent(surrogateTracker, commonParent)
            }
            return surrogateTracker
        }

        // Look up trackers by parent company. This function also checks to see if the poential
        // tracker is related to the current site. If this is the case we consider it to be the
        // same as a first party requrest and return
        let trackerByParentCompany = checkTrackersWithParentCompany(urlSplit, siteDomain, request)
        if (trackerByParentCompany) {
            if (trackerByParentCompany.type === utils.getBeaconName()) {
                trackerByParentCompany.reason = 'beacon'
            }

            let commonParent = getCommonParentEntity(currLocation, urlToCheck)
            if (commonParent) {
                return addCommonParent(trackerByParentCompany, commonParent)
            }
            return trackerByParentCompany
        }
    }
    return false
}

// add common parent info to the final tracker object returned by isTracker
function addCommonParent (trackerObj, parentName) {
    trackerObj.parentCompany = parentName
    trackerObj.prevalence = prevalence[parentName] || 0
    trackerObj.block = false
    trackerObj.reason = 'first party'
    return trackerObj
}

function checkWhitelist (url, currLocation, request) {
    let result = false
    let match
    const whitelists = abpLists.getWhitelists()

    if (whitelists.trackersWhitelist.isLoaded) {
        match = checkABPParsedList(whitelists.trackersWhitelist.parsed, url, currLocation, request)
    }

    if (match) {
        result = getTrackerDetails(url, 'trackersWhitelist')
        result.block = false
        result.reason = 'whitelisted'
    }

    return result
}

function checkSurrogateList (url, parsedUrl, currLocation) {
    let dataURI = surrogates.getContentForUrl(url, parsedUrl)
    let result = false

    if (dataURI) {
        result = getTrackerDetails(url, 'surrogatesList')
        if (result && !isRelatedEntity(result.parentCompany, currLocation)) {
            result.block = true
            result.reason = 'surrogate'
            result.redirectUrl = dataURI
            console.log('serving surrogate content for: ', url)
            return result
        }
    }

    return false
}

/* Check the matched rule  options against the request data
 * return: true (all options matched)
 */
function matchRuleOptions (rule, request, siteDomain) {
    if (!rule.options) return true

    if (rule.options.types) {
        let matchesType = rule.options.types.findIndex(t => { return t === request.type })
        if (matchesType === -1) {
            return false
        }
    }

    if (rule.options.domains) {
        let matchesDomain = rule.options.domains.findIndex(d => { return d === siteDomain })
        if (matchesDomain === -1) {
            return false
        }
    }

    return true
}

function checkTrackersWithParentCompany (url, siteDomain, request) {
    let toBlock

    // base case
    if (url.length < 2) { return false }

    let trackerURL = url.join('.')

    constants.blocking.some(function (trackerType) {
        // Some trackers are listed under just the host name of their parent company without
        // any subdomain. Ex: ssl.google-analytics.com would be listed under just google-analytics.com.
        // Other trackers are listed using their subdomains. Ex: developers.google.com.
        // We'll start by checking the full host with subdomains and then if no match is found
        // try pulling off the subdomain and checking again.
        if (!trackerLists.trackersWithParentCompany[trackerType]) return
        let tracker = trackerLists.trackersWithParentCompany[trackerType][trackerURL]
        if (!tracker) return

        let match = false

        toBlock = {
            parentCompany: tracker.c,
            prevalence: prevalence[tracker.c] || 0,
            url: utils.extractHostFromURL(request.url),
            type: trackerType,
            block: true,
            rule: '',
            reason: 'trackersWithParentCompany'
        }

        // Check to see if this request matches any of the blocking rules for this tracker
        if (tracker.rules) {
            tracker.rules.some(ruleObj => {
                if (requestMatchesRule(request, ruleObj.rule) && matchRuleOptions(ruleObj, request, siteDomain)) {
                    toBlock.rule = ruleObj
                    match = true
                    // found a match so break loop early
                    return true
                }
            })
        } else {
            // no filters so we always block this tracker
            match = true
            return true
        }

        // no match on any of the rules for this tracker
        // reset toBlock for the next iteration
        if (!match) {
            toBlock = null
        } else {
            // we have a rule based match, return early
            return true
        }
    })

    if (toBlock) {
        return toBlock
    } else {
        // remove the subdomain and recheck for trackers. This is recursive, we'll continue
        // to pull off subdomains until we either find a match or have no url to check.
        // Ex: x.y.z.analytics.com would be checked 4 times pulling off a subdomain each time.
        url.shift()
        return checkTrackersWithParentCompany(url, siteDomain, request)
    }
}

function requestMatchesRule (request, rule) {
    return !!rule.exec(request.url)
}

/* Check to see if this tracker is related to the current page through their parent companies
 * Only block request to 3rd parties
 */
function isRelatedEntity (parentCompany, currLocation) {
    var parentEntity = entityList[parentCompany]
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
function getCommonParentEntity (currLocation, urlToCheck) {
    if (!entityMap) return
    let currentLocationParsed = tldjs.parse(currLocation)
    let urlToCheckParsed = tldjs.parse(urlToCheck)
    let parentEntity = entityMap[urlToCheckParsed.domain]
    if (currentLocationParsed.domain === urlToCheckParsed.domain ||
        isRelatedEntity(parentEntity, currLocation)) { return parentEntity || currentLocationParsed.domain }

    return false
}

/* Fetch parent entity for a domain. If domain is not in
 * entityMap, return 'unknown'
 */
function getParentEntity (urlToCheck) {
    if (!entityMap) { return 'unknown' }
    const urlToCheckParsed = tldjs.parse(urlToCheck)
    const parentEntity = entityMap[urlToCheckParsed.domain]
    if (parentEntity) {
        return parentEntity
    } else {
        return 'unknown'
    }
}

function getTrackerDetails (trackerUrl, listName) {
    let host = utils.extractHostFromURL(trackerUrl)
    let parentCompany = utils.findParent(host) || 'unknown'
    return {
        parentCompany: parentCompany,
        prevalence: prevalence[parentCompany] || 0,
        url: host,
        type: listName
    }
}

function checkABPParsedList (list, url, siteDomain, request) {
    let match = abp.matches(list, url,
        {
            domain: siteDomain,
            elementTypeMask: abp.elementTypes[request.type.toUpperCase()]
        })
    return match
}

/*
 *  * If element hiding is enabled on current domain, send messages
 *   * to content scripts to start the process of hiding blocked ads
 *    */
function tryElementHide (requestData, tab) {
    if (tab.site.parentEntity === 'Oath') {
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
module.exports = {
    isTracker: isTracker,
    loadLists: loadLists,
    getParentEntity: getParentEntity,
    tryElementHide: tryElementHide
}
