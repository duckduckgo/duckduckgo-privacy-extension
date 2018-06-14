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

let entityList = {}

function loadLists () {
    load.JSONfromExternalFile(constants.entityList, (list) => { entityList = list })
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
        var socialBlock = settings.getSetting('socialBlockingIsEnabled')
        var blockSettings = constants.blocking.slice(0)

        if (socialBlock) {
            blockSettings.push('Social')
        }

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
        var trackerByParentCompany = checkTrackersWithParentCompany(blockSettings, urlSplit, siteDomain, request)
        if (trackerByParentCompany) {
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

function checkEasylists (url, siteDomain, request) {
    let toBlock = false
    constants.easylists.some((listName) => {
        const easylists = abpLists.getEasylists()

        let match
        // lists can take a second or two to load so check that the parsed data exists
        if (easylists[listName].isLoaded) {
            match = checkABPParsedList(easylists[listName].parsed, url, siteDomain, request)
        }

        // break loop early if a list matches
        if (match) {
            toBlock = getTrackerDetails(url, listName)
            toBlock.block = true
            toBlock.reason = listName
            return toBlock
        }
    })

    return toBlock
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
        let matchesType = rule.options.types.findIndex(t => {return t === request.type})
        if (matchesType === -1) {
            return false
        }
    }
    
    if (rule.options.domains) {
        let matchesDomain = rule.options.domains.findIndex(d => {return d === siteDomain})
        if (matchesDomain === -1) {
            return false
        }
    }

    return true
}

function checkTrackersWithParentCompany (blockSettings, url, siteDomain, request) {
    let toBlock

    // base case
    if (url.length < 2) { return false }

    let trackerURL = url.join('.')

    blockSettings.some(function (trackerType) {
        let request = this.request
        let siteDomain = this.siteDomain

        // Some trackers are listed under just the host name of their parent company without
        // any subdomain. Ex: ssl.google-analytics.com would be listed under just google-analytics.com.
        // Other trackers are listed using their subdomains. Ex: developers.google.com.
        // We'll start by checking the full host with subdomains and then if no match is found
        // try pulling off the subdomain and checking again.
        if (trackerLists.trackersWithParentCompany[trackerType]) {
            let tracker = trackerLists.trackersWithParentCompany[trackerType][trackerURL]
            let match = false

            if (tracker) {
                toBlock = {
                    parentCompany: tracker.c,
                    url: trackerURL,
                    type: trackerType,
                    block: true,
                    rule: '',
                    reason: 'trackersWithParentCompany'
                }

                if (tracker.rules) {
                    tracker.rules.forEach(ruleObj => {
                        if (requestMatchesRule(request, ruleObj.rule)) {
                            if (matchRuleOptions(ruleObj, request, siteDomain)) {
                                toBlock.rule = ruleObj
                                match = true
                            }
                        }
                    })
                } else {
                    // no filters so we always block this tracker
                    match = true
                }

                if (!match) {
                    toBlock = null
                }
            }
        }
    }, {request: request, siteDomain: siteDomain})

    if (toBlock) {
        return toBlock
    } else {
        // remove the subdomain and recheck for trackers. This is recursive, we'll continue
        // to pull off subdomains until we either find a match or have no url to check.
        // Ex: x.y.z.analytics.com would be checked 4 times pulling off a subdomain each time.
        url.shift()
        return checkTrackersWithParentCompany(blockSettings, url, siteDomain, request)
    }
}

function requestMatchesRule (request, rule) {
    if (rule.exec(request.url)) {
        return true
    }
    return false
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

function getTrackerDetails (trackerUrl, listName) {
    let host = utils.extractHostFromURL(trackerUrl)
    let parentCompany = utils.findParent(host.split('.')) || 'unknown'
    return {
        parentCompany: parentCompany,
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

module.exports = {
    isTracker: isTracker,
    loadLists: loadLists
}
