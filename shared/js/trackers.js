
// these are defined in abp.js
var abp,
    easylists,
    whitelists,
    surrogates,
    trackerWhitelist = {}

var load = require('load'),
    settings = require('settings'),
    utils = require('utils'),
    surrogates = require('surrogates'),
    trackerLists = require('trackerLists').getLists()

let entityList
let entityMap

settings.ready().then(() => {
    load.JSONfromExternalFile(constants.entityList, (list) => entityList = list)
    load.JSONfromExternalFile(constants.entityMap, (list) => entityMap = list)
})

require.scopes.trackers = (function() {

    function isTracker(urlToCheck, thisTab, request) {
        let currLocation = thisTab.url || ''
        let siteDomain = thisTab.site ? thisTab.site.domain : ''
        if(!siteDomain) return

        // TODO: easylist is marking some of our requests as trackers. Whitelist us
        // by default for now until we can figure out why.
        if (currLocation.match(/duckduckgo\.com/)) {
            return false
        }

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
            var social_block = settings.getSetting('socialBlockingIsEnabled')
            var blockSettings = constants.blocking.slice(0)

            // don't block 1st party requests
            if (isFirstPartyRequest(currLocation, urlToCheck)) {
                return
            }
            if (social_block) {
                blockSettings.push('Social')
            }

            var whitelistedTracker = checkWhitelist(urlToCheck, siteDomain, request)
            if (whitelistedTracker) {
                return whitelistedTracker
            }


            var surrogateTracker = checkSurrogateList(urlToCheck, parsedUrl, currLocation)
            if (surrogateTracker) {
                return surrogateTracker 
            }

            // Look up trackers by parent company. This function also checks to see if the poential
            // tracker is related to the current site. If this is the case we consider it to be the
            // same as a first party requrest and return
            var trackerByParentCompany = checkTrackersWithParentCompany(blockSettings, urlSplit, currLocation)
            if (trackerByParentCompany) {
            // check cancel to see if this tracker is related to the current site
                if (trackerByParentCompany.cancel) {
                    return
                } else {
                    return trackerByParentCompany
                }
            }

            // block trackers from easylists
            let easylistBlock = checkEasylists(urlToCheck, siteDomain, request)
            if (easylistBlock) {
                return easylistBlock
            }

        }
        return false
    }

    function checkWhitelist(url, currLocation, request) {
        let result = false
        let match

        if (whitelists.trackersWhitelist.isLoaded) {
            match = checkABPParsedList(whitelists.trackersWhitelist.parsed, url, currLocation, request)
        }

        if (match) {
            result = getTrackerDetails(url, 'trackersWhitelist')
            result.block = false
        }

        return result
    }

    function checkEasylists(url, siteDomain, request){
        let toBlock = false
        constants.easylists.some((listName) => {

            let match
            // lists can take a second or two to load so check that the parsed data exists
            if (easylists[listName].isLoaded) {
                match = checkABPParsedList(easylists[listName].parsed, url, siteDomain, request)
            }

            // break loop early if a list matches
            if (match) {
                toBlock = getTrackerDetails(url, listName)
                toBlock.block = true
                return toBlock
            }
        })

        return toBlock
    }

    function checkSurrogateList(url, parsedUrl, currLocation) {
        let dataURI = surrogates.getContentForUrl(url, parsedUrl)

        if (dataURI) {
            result = getTrackerDetails(url, 'surrogatesList')
            if (result && !isRelatedEntity(result.parentCompany, currLocation)) {
                result.block = true
                result.redirectUrl = dataURI
                console.log("serving surrogate content for: ", url)
                return result
            }
        }

        return false
    }

    function checkTrackersWithParentCompany (blockSettings, url, currLocation) {
        var toBlock

        // base case
        if (url.length < 2)
            return false

        let trackerURL = url.join('.')

        blockSettings.some(function (trackerType) {
            // Some trackers are listed under just the host name of their parent company without
            // any subdomain. Ex: ssl.google-analytics.com would be listed under just google-analytics.com.
            // Other trackers are listed using their subdomains. Ex: developers.google.com.
            // We'll start by checking the full host with subdomains and then if no match is found
            // try pulling off the subdomain and checking again.
            if (trackerLists.trackersWithParentCompany[trackerType]) {
                var tracker = trackerLists.trackersWithParentCompany[trackerType][trackerURL]
                if (tracker) {
                    if (!isRelatedEntity(tracker.c, currLocation)) {
                        return toBlock = {
                            parentCompany: tracker.c,
                            url: trackerURL,
                            type: trackerType,
                            block: true
                        }
                    }
                    else {
                        return toBlock = {cancel: 'relatedEntity'}
                    }
                }
            }

        })

        if (toBlock) {
            return toBlock
        }
        else {
            // remove the subdomain and recheck for trackers. This is recursive, we'll continue
            // to pull off subdomains until we either find a match or have no url to check.
            // Ex: x.y.z.analytics.com would be checked 4 times pulling off a subdomain each time.
            url.shift()
            return checkTrackersWithParentCompany(blockSettings, url, currLocation)
        }
    }

    /* Check to see if this tracker is related to the current page through their parent companies
    * Only block request to 3rd parties
    */
    function isRelatedEntity(parentCompany, currLocation) {
        var parentEntity = entityList[parentCompany]
        var host = utils.extractHostFromURL(currLocation)

        if(parentEntity && parentEntity.properties) {

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
    * pull off any subdomains before comparison
    */
    function isFirstPartyRequest(currLocation, urlToCheck) {
        let currentLocationParsed = tldjs.parse(currLocation)
        let urlToCheckParsed = tldjs.parse(urlToCheck)

        if (currentLocationParsed.domain === urlToCheckParsed.domain) {
            return true
        } else {
            let parentEntity = entityMap[urlToCheckParsed.domain]
            if (parentEntity) {
                return isRelatedEntity(parentEntity, currLocation)
            }
        }
        return false
    }

    function getTrackerDetails (trackerUrl, listName) {
        let host = utils.extractHostFromURL(trackerUrl)
        let parentCompany = findParent(host.split('.')) || 'unknown'
        return {
            parentCompany: parentCompany,
            url: host,
            type: listName
        }
    }

    // pull off subdomains and look for parent companies
    function findParent (url) {
        if (url.length < 2) return
        let joinURL = url.join('.')
        if (entityMap[joinURL]) {
            return entityMap[joinURL]
        } else {
            url.shift()
            return findParent(url)
        }
    }

    function checkABPParsedList(list, url, siteDomain, request) {
        let match = abp.matches(list, url,
            {
                domain: siteDomain,
                elementTypeMask: abp.elementTypes[request.type.toUpperCase()]
            })
        return match
    }

    return {
        isTracker: isTracker
    }

})()
