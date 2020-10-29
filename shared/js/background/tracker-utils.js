// Utility functions for dealing with tracker information
const utils = require('./utils.es6')
const trackers = require('./trackers.es6')
const tldts = require('tldts')
const tdsStorage = require('./storage/tds.es6')

// Determine if two URL's belong to the same entity.
function isSameEntity (url1, url2) {
    try {
        const domain1 = tldts.parse(url1).domain
        const domain2 = tldts.parse(url2).domain
        const entity1 = trackers.findWebsiteOwner({ siteUrlSplit: utils.extractHostFromURL(url1).split('.') })
        const entity2 = trackers.findWebsiteOwner({ siteUrlSplit: utils.extractHostFromURL(url2).split('.') })
        if (domain1 === domain2) return true
        if (entity1 === undefined && entity2 === undefined) return false
        return entity1 === entity2
    } catch (TypeError) {
        // tried to parse invalid URL
        return false
    }
}

// return true if URL is in our tracker list
function isTracker (url) {
    const data = {
        urlToCheckSplit: utils.extractHostFromURL(url).split('.')
    }
    const tracker = trackers.findTracker(data)
    return !!tracker
}

/*
 * Truncate the referrer header/API value according to the following rules:
 *   Don't modify the value when:
 *   - If the referrer is blank, it will not be modified.
 *   - If the referrer domain OR request domain are safe listed, the referrer will not be modified
 *   - If the referrer domain and request domain are part of the same entity (as defined in our
 *     entities file for first party sets), the referrer will not be modified.
 *
 *   Modify the referrer when:
 *   - If the destination is in our tracker list, we will trim it to eTLD+1 (remove path and subdomain information)
 *   - In all other cases (the general case), the referrer will be modified to only the referrer origin (includes subdomain).
 */
function truncateReferrer (referrer, target) {
    if (referrer === '') {
        return undefined
    }

    if (utils.isSafeListed(referrer) || utils.isSafeListed(target)) {
        return undefined
    }

    if (isSameEntity(referrer, target)) {
        return undefined
    }

    const excludedDomains = tdsStorage.ReferrerExcludeList.excludedReferrers.map(e => e.domain)
    if (excludedDomains.includes(tldts.parse(referrer).domain) ||
        excludedDomains.includes(tldts.parse(target).domain)) {
        // referrer or target is in the Referrer safe list
        return undefined
    }

    let modifiedReferrer = referrer
    if (isTracker(target)) {
        modifiedReferrer = utils.extractLimitedDomainFromURL(referrer, false)
    } else {
        modifiedReferrer = utils.extractLimitedDomainFromURL(referrer, true)
    }
    // If extractLimitedDomainFromURL fails (for instance, invalid referrer URL), it
    // returns undefined, (in practice, don't modify the referrer), so sometimes this value could be undefined.
    return modifiedReferrer
}

module.exports = {
    isSameEntity: isSameEntity,
    isTracker: isTracker,
    truncateReferrer: truncateReferrer
}
