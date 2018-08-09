const tldjs = require('tldjs')
const load = require('./load.es6')
const settings = require('./settings.es6')
const surrogates = require('./surrogates.es6')
const trackerLists = require('./tracker-lists.es6').getLists()
const abpLists = require('./abp-lists.es6')
const constants = require('../../data/constants')
const utils = require('./utils.es6')
const entityMap = require('../../data/tracker_lists/entityMap')

let entityList = {}

function loadLists () {
    load.JSONfromExternalFile(constants.entityList).then((response) => { entityList = response.data })
}

/*
 * The main parts of the isTracker algo looks like this:
 * 1. check the request for embedded tweets
 * 2. check the request against our surrogate list
 * 3. check the request against the trackersWithParentCompany list
 *
 * If a tracker is found we check it against checkFirstParty
 * to determine if this tracker is owned by the current site's parent company.
 * In this case we don't block the request but still return the tracker obj
 * for transparency.
 */
function isTracker (urlToCheck, thisTab, request) {
    let currLocation = thisTab.url || ''
    let siteDomain = thisTab.site ? thisTab.site.domain : ''
    if (!siteDomain || !settings.getSetting('trackerBlockingEnabled')) return
        
    let parsedUrl = tldjs.parse(urlToCheck)

    let embeddedTweets = checkEmbeddedTweets(urlToCheck, settings.getSetting('embeddedTweetsEnabled'))
    if (embeddedTweets) {
        return checkFirstParty(embeddedTweets, currLocation, urlToCheck)
    }

    let surrogateTracker = checkSurrogateList(urlToCheck, parsedUrl, currLocation)
    if (surrogateTracker) {
        return checkFirstParty(surrogateTracker, currLocation, urlToCheck) 
    }

    let urlSplit = getSplitURL(parsedUrl)
    let trackerByParentCompany = checkTrackersWithParentCompany(urlSplit, siteDomain, request)
    if (trackerByParentCompany) {
        return checkFirstParty(trackerByParentCompany, currLocation, urlToCheck)
    }
    return false
}

function getSplitURL (parsedUrl) {
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
    return hostname.split('.')
}

/*
 * Check current location and tracker url to determine if they are first-party
 * or related entities. Sets block status to 'false' if they are first-party
 */
function checkFirstParty (returnObj, currLocation, urlToCheck) {
    let commonParent = getCommonParentEntity(currLocation, urlToCheck)
    if (commonParent) {
        return addCommonParent(returnObj, commonParent)
    }
    return returnObj
}

// add common parent info to the final tracker object returned by isTracker
function addCommonParent (trackerObj, parentName) {
    trackerObj.parentCompany = parentName
    trackerObj.block = false
    trackerObj.reason = 'first party'
    return trackerObj
}

function checkEmbeddedTweets (urlToCheck, embeddedOn) {
    if (!embeddedOn && /platform.twitter.com/.test(urlToCheck)) {
        console.log('blocking tweet embedded code on ' + urlToCheck)
        return {parentCompany: 'Twitter', url: 'platform.twitter.com', type: 'Analytics', block: true}
    }
    return false
}

function checkSurrogateList (url, parsedUrl, currLocation) {
    let dataURI = surrogates.getContentForUrl(url, parsedUrl)

    if (dataURI) {
        const parent = utils.findParent(url)
        if (parent && !isRelatedEntity(parent, currLocation)) {
            const trackerObj = {data: {c: parent}, block: true, type: 'surrogatesList'}
            let result = getReturnTrackerObj(trackerObj, url, 'surrogate') 
            result.redirectUrl = dataURI
            console.log('serving surrogate content for: ', url)
            return result
        }
    }
    return false
}

function checkTrackersWithParentCompany (url, siteDomain, request) {
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
        if (!trackerLists.trackersWithParentCompany[trackerType]) return
        let tracker = trackerLists.trackersWithParentCompany[trackerType][trackerURL]
        if (!tracker) return

        // Check to see if this request matches any of the blocking rules for this tracker
        if (tracker.rules) {
            tracker.rules.some(ruleObj => {
                if (requestMatchesRule(request, ruleObj, siteDomain)) {
                    matchedTracker = {data: tracker, rule: ruleObj.rule, type: trackerType, block: true} 
                    // break loop early
                    return true
                }
            })
        } else {
            // no filters so we always block this tracker
            matchedTracker = {data: tracker, type: trackerType, block: true}
            return true
        }
    })

    if (matchedTracker) {
        if (matchedTracker.data.whitelist) {
            const foundOnWhitelist = matchedTracker.data.whitelist.some(ruleObj => {
                if (requestMatchesRule(request, ruleObj, siteDomain)) {
                    matchedTracker.block = false
                    // break loop early
                    return true
                }
            })
        }
        return getReturnTrackerObj(matchedTracker, request, 'trackersWithParentCompany')
    } else {
        // remove the subdomain and recheck for trackers. This is recursive, we'll continue
        // to pull off subdomains until we either find a match or have no url to check.
        // Ex: x.y.z.analytics.com would be checked 4 times pulling off a subdomain each time.
        url.shift()
        return checkTrackersWithParentCompany(url, siteDomain, request)
    }
}

function requestMatchesRule (request, ruleObj, siteDomain) {
    if (ruleObj.rule.exec(request.url)) {
        return matchRuleOptions(ruleObj, request, siteDomain)
    } else {
        return false
    }
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

// isTracker return object. Takes either surrogate or tracker info
// and returns a common data sturucture
function getReturnTrackerObj (tracker, request, reason) {
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
        reason: reason
    }
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

module.exports = {
    isTracker: isTracker,
    loadLists: loadLists
}
