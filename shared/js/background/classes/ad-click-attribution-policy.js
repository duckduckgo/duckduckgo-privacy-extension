import {
    AD_ATTRIBUTION_POLICY_PRIORITY
} from '@duckduckgo/ddg2dnr/lib/rulePriorities'

import {
    generateDNRRule
} from '@duckduckgo/ddg2dnr/lib/utils'

const { getFeatureSettings, getBaseDomain } = require('../utils.es6')
const browserWrapper = require('../wrapper.es6')
const { getNextSessionRuleId } = require('../dnr-session-rule-id')

const manifestVersion = browserWrapper.getManifestVersion()

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

        if (manifestVersion === 3) {
            adClick.adClickDNR = new AdClickDNR(tab.id, this.allowlist)
        }

        if (linkFormat.adDomainParameterName) {
            const parameterDomain = resourceURL.searchParams.get(linkFormat.adDomainParameterName)
            if (parameterDomain && this.domainDetectionEnabled) {
                const parsedParameterDomain = getBaseDomain(parameterDomain)
                if (parsedParameterDomain) {
                    adClick.setAdBaseDomain(parsedParameterDomain, false)
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
        this.adClickDNR = null
    }

    clone () {
        const adClick = new AdClick(this.navigationExpiration, this.totalExpiration)
        adClick.adBaseDomain = this.adBaseDomain
        adClick.adClickRedirect = this.adClickRedirect
        adClick.expires = this.expires
        adClick.clickExpires = Date.now() + (this.navigationExpiration * 1000)
        adClick.adClickDNR = this.adClickDNR
        return adClick
    }

    propagate (tabId) {
        const adClick = this.clone()
        adClick.adClickDNR = new AdClickDNR(tabId, this.adClickDNR.allowlist)
        return adClick
    }

    static restore (adClick) {
        const restoredAdClick = new AdClick(adClick.navigationExpiration, adClick.totalExpiration)
        restoredAdClick.adBaseDomain = adClick.adBaseDomain
        restoredAdClick.adClickRedirect = adClick.adClickRedirect
        restoredAdClick.expires = adClick.expires
        restoredAdClick.clickExpires = adClick.clickExpires
        restoredAdClick.adClickDNR = adClick.adClickDNR
        return restoredAdClick
    }

    /**
     * @param {string} domain
     * @param {boolean} adClickRedirect
     **/
    setAdBaseDomain (domain, adClickRedirect) {
        this.adBaseDomain = domain
        this.adClickRedirect = adClickRedirect
        this.adClickDNR?.updateInitiator(domain)
    }

    removeAdClickDNR () {
        if (this.adClickDNR) {
            chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [this.adClickDNR.rule.id] })
        }
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
        if (this.expires > Date.now()) {
            return true
        } else {
            this.removeAdClickDNR()
            return false
        }
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

/**
 * @param {number} tabId
 * @param {object} allowlist
 **/
export class AdClickDNR {
    constructor (tabId, allowlist) {
        this.allowlist = allowlist
        this.rule = generateDNRRule({
            id: getNextSessionRuleId(),
            priority: AD_ATTRIBUTION_POLICY_PRIORITY,
            actionType: 'allow',
            requestDomains: allowlist.map((entry) => entry.host)
        })
        this.rule.condition.tabIds = [tabId]
        this.createDNR()
    }

    updateInitiator (domain) {
        this.rule.condition.initiatorDomains = [domain]
        this.updateDNR()
    }

    /**
     * Create initial tab scoped DNR rule not limited to any initiatorDomains.
     **/
    createDNR () {
        chrome.declarativeNetRequest.updateSessionRules({ addRules: [this.rule] })
    }

    updateDNR () {
        chrome.declarativeNetRequest.updateSessionRules({
            removeRuleIds: [this.rule.id],
            addRules: [this.rule]
        })
    }
}
