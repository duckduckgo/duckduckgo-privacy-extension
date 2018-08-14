const tldjs = require('tldjs')
const load = require('./load.es6')
const settings = require('./settings.es6')
const surrogates = require('./surrogates.es6')
const trackerLists = require('./tracker-lists.es6').getLists()
const constants = require('../../data/constants')
const utils = require('./utils.es6')
const entityMap = require('../../data/tracker_lists/entityMap')

let entityList = {}

function loadLists () {
    load.JSONfromExternalFile(constants.entityList).then((response) => { entityList = response.data })
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
function isTracker (urlToCheck, thisTab, request) {
    const currLocation = thisTab.url || ''
    const siteDomain = thisTab.site ? thisTab.site.domain : ''
    if (!siteDomain || !settings.getSetting('trackerBlockingEnabled')) return

    let embeddedTweets = checkEmbeddedTweets(urlToCheck, settings.getSetting('embeddedTweetsEnabled'))
    if (embeddedTweets) {
        return checkFirstParty(embeddedTweets, currLocation, urlToCheck)
    }

    const parsedUrl = tldjs.parse(urlToCheck)
    const urlSplit = getSplitURL(parsedUrl, urlToCheck)
    let trackerByParentCompany = checkTrackersWithParentCompany(urlSplit, siteDomain, request)
    if (trackerByParentCompany) {
        // if we have a match, check to see if we have surrogate JS for this tracker
        trackerByParentCompany.redirectUrl = surrogates.getContentForUrl(urlToCheck, parsedUrl)
        return checkFirstParty(trackerByParentCompany, currLocation, urlToCheck)
    }
    return false
}

// return a hostname split on '.'
function getSplitURL (parsedUrl, urlToCheck) {
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
        const tracker = trackerLists.trackersWithParentCompany[trackerType][trackerURL]
        if (!tracker) return

        // Check to see if this request matches any of the blocking rules for this tracker
        if (tracker.rules && tracker.rules.length) {
            tracker.rules.some(ruleObj => {
                if (requestMatchesRule(request, ruleObj, siteDomain)) {
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
    })

    if (matchedTracker) {
        if (matchedTracker.data.whitelist) {
            const foundOnWhitelist = matchedTracker.data.whitelist.some(ruleObj => {
                if (requestMatchesRule(request, ruleObj, siteDomain)) {
                    matchedTracker.block = false
                    matchedTracker.type = 'trackersWhitelist'
                    // break loop early
                    return true
                }
            })

            if (foundOnWhitelist) {
                return getReturnTrackerObj(matchedTracker, request, 'whitelisted')
            }
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

    if (rule.options.types && !rule.options.types.includes(request.type)) {
        return false
    }

    if (rule.options.domains && !rule.options.domains.includes(siteDomain)) {
        return false
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
        reason: reason,
        redirectUrl: tracker.redirectUrl || null
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
