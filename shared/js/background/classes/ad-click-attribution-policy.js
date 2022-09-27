const { getFeatureSettings, getBaseDomain } = require('../utils.es6')

/**
 * @typedef AdClickAttributionLinkFormat
 * @property {string} url
 * @property {string} [adDomainParameterName]
 **/

/**
 * @typedef AdClickAttributionAllowListItem
 * @property {string} blocklistEntry
 * @property {string} host
 **/

/**
 * @typedef { import('./tab.es6') } Tab
 */

export class AdClickAttributionPolicy {
    constructor () {
        const policy = getFeatureSettings('adClickAttribution')

        /** @type {AdClickAttributionLinkFormat[]} */
        this.linkFormats = policy.linkFormats || []
        /** @type {AdClickAttributionAllowListItem[]} */
        this.allowlist = policy.allowlist || []
        this.navigationExpiration = policy.navigationExpiration || 0
        this.totalExpiration = policy.totalExpiration || 0
        this.domainDetectionEnabled = policy.domainDetection === 'enabled'
        this.heuristicDetectionEnabled = policy.heuristicDetection === 'enabled'
    }

    /**
     * @param {URL} resourceURL
     * @returns {AdClickAttributionLinkFormat | undefined}
     */
    getMatchingLinkFormat (resourceURL) {
        const hostnameAndPath = resourceURL.hostname + resourceURL.pathname

        for (const linkFormat of this.linkFormats) {
            if (hostnameAndPath === linkFormat.url) {
                if (linkFormat.adDomainParameterName) {
                    const parameterDomain = resourceURL.searchParams.get(linkFormat.adDomainParameterName)
                    if (parameterDomain !== null) {
                        return linkFormat
                    }
                }
            }
        }
    }

    /**
     * Constructs an AdClick object to be stored on the tab if the load is a valid ad click link format.
     * @param {string} resourcePath
     * @param {Tab} tab
     * @returns {AdClick | undefined}
     */
    createAdClick (resourcePath, tab) {
        let resourceURL
        try {
            resourceURL = new URL(resourcePath)
        } catch {
            return
        }
        const linkFormat = this.getMatchingLinkFormat(resourceURL)
        if (!linkFormat) return

        const adClick = new AdClick(this.navigationExpiration, this.totalExpiration)

        if (linkFormat.adDomainParameterName) {
            const parameterDomain = resourceURL.searchParams.get(linkFormat.adDomainParameterName)
            if (parameterDomain && this.domainDetectionEnabled) {
                const parsedParameterDomain = getBaseDomain(parameterDomain)
                if (parsedParameterDomain) {
                    adClick.adBaseDomain = parsedParameterDomain
                    adClick.adClickRedirect = false
                    return adClick
                }
            }
        }
        if (this.heuristicDetectionEnabled) {
            adClick.adClickRedirect = true
            return adClick
        }
    }

    /**
     * @param {string} resourcePath
     * @returns {boolean}
     */
    resourcePermitted (resourcePath) {
        let resourceURL
        try {
            resourceURL = new URL(resourcePath)
        } catch {
            return true // fail open if we can't parse the URL
        }
        for (const allowlistItem of this.allowlist) {
            if (resourceURL.hostname === allowlistItem.host || resourceURL.hostname.endsWith('.' + allowlistItem.host)) {
                return true
            }
        }
        return false
    }
}

export class AdClick {
    /**
     * @param {number} navigationExpiration in seconds
     * @param {number} totalExpiration in seconds
     */
    constructor (navigationExpiration, totalExpiration) {
        /** @type {string | null} */
        this.adBaseDomain = null
        this.adClickRedirect = false
        this.navigationExpiration = navigationExpiration
        this.totalExpiration = totalExpiration
        this.expires = Date.now() + (this.totalExpiration * 1000)
        this.clickExpires = Date.now() + (this.navigationExpiration * 1000)
    }

    clone () {
        const adClick = new AdClick(this.navigationExpiration, this.totalExpiration)
        adClick.adBaseDomain = this.adBaseDomain
        adClick.adClickRedirect = this.adClickRedirect
        adClick.expires = this.expires
        adClick.clickExpires = Date.now() + (this.navigationExpiration * 1000)
        return adClick
    }

    static restore (adClick) {
        const restoredAdClick = new AdClick(adClick.navigationExpiration, adClick.totalExpiration)
        restoredAdClick.adBaseDomain = adClick.adBaseDomain
        restoredAdClick.adClickRedirect = adClick.adClickRedirect
        restoredAdClick.expires = adClick.expires
        restoredAdClick.clickExpires = adClick.clickExpires
        return restoredAdClick
    }

    /**
     * @param {Tab} tab
     * @returns {boolean} true if a new tab should have the ad attribution policy applied
     */
    shouldPropagateAdClickForNewTab (tab) {
        if (tab.site.baseDomain === this.adBaseDomain) {
            return this.hasNotExpired()
        }
        return false
    }

    /**
     * @param {Tab} tab
     * @returns {boolean} true if a new navigation should have the ad attribution policy applied
     */
    shouldPropagateAdClickForNavigation (tab) {
        if (tab.site.baseDomain !== this.adBaseDomain) {
            return this.clickExpires > Date.now()
        }
        return this.hasNotExpired()
    }

    hasNotExpired () {
        return this.expires > Date.now()
    }

    /**
     * For use of checking if a load should be permitted for a tab.
     * Returns true if the policy hasn't expired and the ad domain matches the tab domain.
     * @param {Tab} tab
     * @returns {boolean}
     */
    allowAdAttribution (tab) {
        if (tab.site.baseDomain !== this.adBaseDomain) return false
        return this.hasNotExpired()
    }
}
