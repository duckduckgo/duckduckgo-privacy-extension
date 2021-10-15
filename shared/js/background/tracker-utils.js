// Utility functions for dealing with tracker information
import * as utils from './utils'
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

/**
 * Determine if the social entity should be blocked on this URL. returns True if so.
 */
export function shouldBlockSocialNetwork (entity, url) {
    const domain = tldts.parse(url).domain
    const excludeData = getDomainsToExludeByNetwork()
    return excludeData.filter(e => e.domain === domain && e.entity === entity).length === 0
}

/*
 * Parse the social config to find excluded domains by social tracker. This then returns a list of objects
 * that include the exlcuded domain and network, for use in other exception list handling.
 */
const socialExcludeCache = {
    excludes: [],
    expireTime: 0,
    refreshTimeMS: 1000 * 60 * 30 // 30 minutes
}
export function getDomainsToExludeByNetwork () {
    if (Date.now() < socialExcludeCache.expireTime) {
        return socialExcludeCache.excludes
    }
    socialExcludeCache.excludes = []
    for (const [entity, data] of Object.entries(tdsStorage.ClickToLoadConfig)) {
        if (data.excludedDomains) {
            const excludedDomains = data.excludedDomains.map(e => e.domain)
            for (const domain of excludedDomains) {
                socialExcludeCache.excludes.push({
                    entity: entity,
                    domain: domain
                })
            }
        }
    }
    socialExcludeCache.expireTime = Date.now() + socialExcludeCache.refreshTimeMS
    return socialExcludeCache.excludes
}

// Return true if URL is in our click to load tracker list
export function getSocialTracker (url) {
    const parsedDomain = tldts.parse(url)
    for (const [entity, data] of Object.entries(tdsStorage.ClickToLoadConfig)) {
        if (data.domains.includes(parsedDomain.domain) && !data.excludedSubdomains.includes(parsedDomain.hostname)) {
            let redirect
            if (data.surrogates) {
                for (const surrogate of data.surrogates) {
                    if (url.match(surrogate.rule)) {
                        redirect = surrogate.surrogate
                        break
                    }
                }
            }
            return {
                entity: entity,
                data: data,
                redirectUrl: redirect
            }
        }
    }
}

// Determine if a given URL is surrogate redirect.
export function getXraySurrogate (url) {
    const u = new URL(url)
    for (const [, data] of Object.entries(tdsStorage.ClickToLoadConfig)) {
        if (data.surrogates) {
            for (const surrogate of data.surrogates) {
                if (u.pathname === `/web_accessible_resources/${surrogate.surrogate}`) {
                    return surrogate.xray
                }
            }
        }
    }
    return undefined
}

// Ensure we allow logged in sites to access facebook
const logins = []
export function allowSocialLogin (url) {
    const domain = utils.extractHostFromURL(url)
    if (!logins.includes(domain)) {
        logins.push(domain)
    }
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

    if (isSameEntity(referrer, target)) {
        return undefined
    }

    const exceptionList = tdsStorage.config.features.referrer.exceptions
    if (utils.brokenListIndex(referrer, exceptionList) !== -1 || utils.brokenListIndex(target, exceptionList) !== -1) {
        return undefined
    }

    let modifiedReferrer = referrer
    if (isTracker(target)) {
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

    const tracker = trackers.findTracker({ urlToCheckSplit: utils.extractHostFromURL(trackerUrl).split('.') })
    if (!tracker) {
        // Fallback to domain check if no tracker is found
        return utils.isSameTopLevelDomain(trackerUrl, siteUrl)
    }

    const trackerOwner = trackers.findTrackerOwner(tldts.parse(trackerUrl).domain)
    const websiteOwner = trackers.findWebsiteOwner({ siteUrlSplit: utils.extractHostFromURL(siteUrl).split('.') })

    return (trackerOwner && websiteOwner) ? trackerOwner === websiteOwner : false
}
