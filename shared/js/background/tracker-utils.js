// Utility functions for dealing with tracker information
import * as utils from './utils.es6'
import trackers from './trackers.es6'
import * as tldts from 'tldts'
import tdsStorage from './storage/tds.es6'

export function hasTrackerListLoaded () {
    return !!trackers.trackerList
}

// Determine if two URL's belong to the same entity.
export function isSameEntity (url1, url2) {
    try {
        const domain1 = tldts.parse(url1).domain
        const domain2 = tldts.parse(url2).domain
        if (domain1 === domain2) return true

        const entity1 = trackers.findWebsiteOwner({ siteUrlSplit: utils.extractHostFromURL(url1).split('.') })
        const entity2 = trackers.findWebsiteOwner({ siteUrlSplit: utils.extractHostFromURL(url2).split('.') })
        if (entity1 === undefined && entity2 === undefined) return false
        return entity1 === entity2
    } catch (e) {
        // tried to parse invalid URL
        return false
    }
}

// return true if URL is in our tracker list
export function isTracker (url) {
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
export function truncateReferrer (referrer, target) {
    if (!referrer || referrer === '') {
        return undefined
    }

    if (utils.isSafeListed(referrer) || utils.isSafeListed(target)) {
        return undefined
    }

    // tracker can be cloaked using CNAME
    const { fromCname, finalURL } = trackers.resolveCname(target)

    if (isSameEntity(referrer, target) && (!fromCname || isSameEntity(referrer, finalURL))) {
        return undefined
    }

    const exceptionList = tdsStorage.config.features.referrer.exceptions
    if (utils.brokenListIndex(referrer, exceptionList) !== -1 || utils.brokenListIndex(target, exceptionList) !== -1) {
        return undefined
    }

    let modifiedReferrer = referrer
    if (isTracker(target) || (fromCname && isTracker(finalURL))) {
        modifiedReferrer = utils.extractLimitedDomainFromURL(referrer, { keepSubdomains: false })
    } else {
        modifiedReferrer = utils.extractLimitedDomainFromURL(referrer, { keepSubdomains: true })
    }
    // If extractLimitedDomainFromURL fails (for instance, invalid referrer URL), it
    // returns undefined, (in practice, don't modify the referrer), so sometimes this value could be undefined.
    return modifiedReferrer
}

/**
 * Checks if a tracker is a first party by checking entity data
 * @param {string} trackerUrl
 * @param {string} siteUrl
 * @returns {boolean}
 */
export function isFirstPartyByEntity (trackerUrl, siteUrl) {
    const cnameResolution = trackers.resolveCname(trackerUrl)
    trackerUrl = cnameResolution.finalURL

    if (utils.isSameTopLevelDomain(trackerUrl, siteUrl)) {
        return true
    }

    const trackerDomain = tldts.parse(trackerUrl).domain
    if (!trackerDomain) return false
    const trackerOwner = trackers.findTrackerOwner(trackerDomain)
    const websiteOwner = trackers.findWebsiteOwner({ siteUrlSplit: utils.extractHostFromURL(siteUrl).split('.') })

    return (trackerOwner && websiteOwner) ? trackerOwner === websiteOwner : false
}
