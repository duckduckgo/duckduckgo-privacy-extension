// Utility functions for dealing with tracker information
const utils = require('./utils.es6')
const trackers = require('./trackers.es6')
const tldts = require('tldts')
const tdsStorage = require('./storage/tds.es6')
const settings = require('./settings.es6')

// Determine if two URL's belong to the same entity.
function isSameEntity (url1, url2) {
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
function isTracker (url) {
    const data = {
        urlToCheckSplit: utils.extractHostFromURL(url).split('.')
    }
    const tracker = trackers.findTracker(data)
    return !!tracker
}

/**
 * Determine if the social entity should be blockedon this URL. returns True if so.
 */
function shouldBlockSocialNetwork (entity, url) {
    const domain = tldts.parse(url).domain
    const excludeData = getDomainsToExludeByNetwork()
    return excludeData.filter(e => e.domain === domain && e.entity === entity).length === 0
}

/*
 * Parse the social config to find excluded domains by social tracker. This then returns a list of objects
 * that include the exlcuded domain and network, for use in other exception list handling.
 */
function getDomainsToExludeByNetwork () {
    const excludes = []
    for (const [entity, data] of Object.entries(tdsStorage.ClickToLoadConfig)) {
        if (data.excludedDomains) {
            const excludedDomains = data.excludedDomains.map(e => e.domain)
            for (const domain of excludedDomains) {
                excludes.push({
                    entity: entity,
                    domain: domain
                })
            }
        }
    }
    return excludes
}

// Return true if URL is in our click to load tracker list
function getSocialTracker (url) {
    const parsedDomain = tldts.parse(url)
    for (const [entity, data] of Object.entries(tdsStorage.ClickToLoadConfig)) {
        if (data.domains.includes(parsedDomain.domain) && !data.excludedSubdomains.includes(parsedDomain.hostname)) {
            let redirect
            if (data.surrogates) {
                for (const surrogate of data.surrogates) {
                    if (url.match(surrogate.rule)) {
                        redirect = surrogate.surrogate
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
function getXraySurrogate (url) {
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
function allowSocialLogin (url) {
    const domain = utils.extractHostFromURL(url)
    if (!logins.includes(domain)) {
        logins.push(domain)
    }
}

/**
 * Return true if the user has permanently saved the domain/tracker combination
 */
function socialTrackerIsAllowedByUser (trackerEntity, domain) {
    if (logins.includes(domain)) {
        return true
    }
    let allowList = settings.getSetting('clickToLoad')
    if (allowList) {
        allowList = allowList.filter(e => e.domain === domain && e.tracker === trackerEntity)
        if (allowList.length > 0) {
            return true
        }
    }
    return false
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
    if (!referrer || referrer === '') {
        return undefined
    }

    if (utils.isSafeListed(referrer) || utils.isSafeListed(target)) {
        return undefined
    }

    if (isSameEntity(referrer, target)) {
        return undefined
    }

    if (tdsStorage.ReferrerExcludeList && tdsStorage.ReferrerExcludeList.excludedReferrers) {
        const excludedDomains = tdsStorage.ReferrerExcludeList.excludedReferrers.map(e => e.domain)
        try {
            if (excludedDomains.includes(tldts.parse(referrer).domain) ||
                excludedDomains.includes(tldts.parse(target).domain)) {
                // referrer or target is in the Referrer safe list
                return undefined
            }
        } catch (e) {
            // if we can't parse the domains for any reason, assume it's not exluded.
        }
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

module.exports = {
    isSameEntity: isSameEntity,
    isTracker: isTracker,
    truncateReferrer: truncateReferrer,
    getSocialTracker: getSocialTracker,
    socialTrackerIsAllowedByUser: socialTrackerIsAllowedByUser,
    shouldBlockSocialNetwork: shouldBlockSocialNetwork,
    getDomainsToExludeByNetwork: getDomainsToExludeByNetwork,
    getXraySurrogate: getXraySurrogate,
    allowSocialLogin: allowSocialLogin
}
