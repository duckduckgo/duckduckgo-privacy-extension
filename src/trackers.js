const abp = require('abp-filter-parser')
const utils = require('./utils')
const trackersWithParentCompany = require('../data/generated/trackers-with-parent-company')
const entityMap = require('../data/generated/entity-map')
const surrogates = require('./surrogates')

const blockSettings = ['Advertising', 'Analytics']

class Trackers {
    addLists (lists) {
        this.entityList = lists.entityList
        this.whitelist = {}

        abp.parse(lists.whitelist, this.whitelist)
    }

    isTracker (urlToCheck, currLocation, requestType, ops) {
        ops = ops || {}

        if (!this.entityList || !this.whitelist) {
            throw new Error('tried to detect trackers before rules were loaded')
        }

        let currLocationDomain = utils.getDomain(currLocation)
        let hostnameToCheck = utils.extractHostFromURL(urlToCheck)
        let parsedUrl = { domain: utils.getDomain(urlToCheck) }

        if (!hostnameToCheck) {
            return false
        }

        let urlSplit = hostnameToCheck.split('.')

        let whitelistedTracker = this.checkWhitelist(urlToCheck, currLocationDomain, requestType)
        if (whitelistedTracker) {
            let commonParent = this.getCommonParentEntity(currLocation, urlToCheck)
            if (commonParent) {
                return this.addCommonParent(whitelistedTracker, commonParent)
            }
            return whitelistedTracker
        }

        let surrogateTracker = this.checkSurrogateList(urlToCheck, parsedUrl, currLocation)
        if (surrogateTracker) {
            let commonParent = this.getCommonParentEntity(currLocation, urlToCheck)
            if (commonParent) {
                return this.addCommonParent(surrogateTracker, commonParent)
            }
            return surrogateTracker
        }

        let trackerFromList = this.checkTrackerLists(urlSplit, currLocation, urlToCheck, requestType)
        if (trackerFromList) {
            let commonParent = this.getCommonParentEntity(currLocation, urlToCheck)
            if (commonParent) {
                return this.addCommonParent(trackerFromList, commonParent)
            }
            return trackerFromList
        }

        // embedded tweet option
        // a more robust test for tweet code may need to be used besides just
        // blocking platform.twitter.com
        if (ops.embeddedTweetsEnabled === false &&
                /platform.twitter.com/.test(urlToCheck)) {
            let tracker = { parentCompany: 'Twitter', url: 'platform.twitter.com', type: 'Analytics', block: true }
            let commonParent = this.getCommonParentEntity(currLocation, urlToCheck)

            if (commonParent) {
                return this.addCommonParent(tracker, commonParent)
            }
            return tracker
        }

        return false
    }

    // add common parent info to the final tracker object returned by isTracker
    addCommonParent (trackerObj, parentName) {
        trackerObj.parentCompany = parentName
        trackerObj.block = false
        trackerObj.reason = 'first party'
        return trackerObj
    }

    checkTrackerLists (urlSplit, currLocation, urlToCheck, requestType) {
        // Look up trackers by parent company. This function also checks to see if the poential
        // tracker is related to the current site. If this is the case we consider it to be the
        // same as a first party requrest and return
        let trackerByParentCompany = this.checkTrackersWithParentCompany(urlSplit, currLocation)
        if (trackerByParentCompany) {
            return trackerByParentCompany
        }
    }

    checkWhitelist (url, currLocationDomain, requestType) {
        let result = false
        let match

        match = this.checkABPParsedList(this.whitelist, url, currLocationDomain, requestType)

        if (match) {
            result = this.getTrackerDetails(url, 'trackersWhitelist')
            result.block = false
            result.reason = 'whitelisted'
        }

        return result
    }

    checkSurrogateList (url, parsedUrl, currLocation) {
        let dataURI = surrogates.getContentForUrl(url, parsedUrl)
        let result = false

        if (dataURI) {
            result = this.getTrackerDetails(url, 'surrogatesList')
            if (result && !this.isRelatedEntity(result.parentCompany, currLocation)) {
                result.block = true
                result.reason = 'surrogate'
                result.redirectUrl = dataURI
                return result
            }
        }

        return false
    }

    checkTrackersWithParentCompany (url, currLocation) {
        let toBlock

        // base case
        if (url.length < 2) { return false }

        let trackerURL = url.join('.')

        blockSettings.some(function (trackerType) {
            // Some trackers are listed under just the host name of their parent company without
            // any subdomain. Ex: ssl.google-analytics.com would be listed under just google-analytics.com.
            // Other trackers are listed using their subdomains. Ex: developers.google.com.
            // We'll start by checking the full host with subdomains and then if no match is found
            // try pulling off the subdomain and checking again.
            if (trackersWithParentCompany[trackerType]) {
                let tracker = trackersWithParentCompany[trackerType][trackerURL]
                if (tracker) {
                    toBlock = {
                        parentCompany: tracker.c,
                        url: trackerURL,
                        type: trackerType,
                        block: true,
                        reason: 'trackersWithParentCompany'
                    }

                    return toBlock
                }
            }
        })

        if (toBlock) {
            return toBlock
        } else {
            // remove the subdomain and recheck for trackers. This is recursive, we'll continue
            // to pull off subdomains until we either find a match or have no url to check.
            // Ex: x.y.z.analytics.com would be checked 4 times pulling off a subdomain each time.
            url.shift()
            return this.checkTrackersWithParentCompany(url, currLocation)
        }
    }

    /* Check to see if this tracker is related to the current page through their parent companies
     * Only block request to 3rd parties
     */
    isRelatedEntity (parentCompany, currLocation) {
        let parentEntity = this.entityList[parentCompany]
        let host = utils.extractHostFromURL(currLocation)

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
        let currLocationDomain = utils.getDomain(currLocation)
        let urlToCheckDomain = utils.getDomain(urlToCheck)
        let parentEntity = entityMap[urlToCheckDomain]
        if (currLocationDomain === urlToCheckDomain ||
                this.isRelatedEntity(parentEntity, currLocation)) {
            return parentEntity || currLocationDomain
        }

        return false
    }

    getTrackerDetails (trackerUrl, listName) {
        let host = utils.extractHostFromURL(trackerUrl)
        let parentCompany = utils.findParent(host.split('.')) || 'unknown'
        return {
            parentCompany: parentCompany,
            url: host,
            type: listName
        }
    }

    checkABPParsedList (list, url, currLocationDomain, requestType) {
        let match = abp.matches(list, url,
            {
                domain: currLocationDomain,
                elementTypeMask: abp.elementTypes[requestType.toUpperCase()]
            })
        return match
    }
}

module.exports = new Trackers()
