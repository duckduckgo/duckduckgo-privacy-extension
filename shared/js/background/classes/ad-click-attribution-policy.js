import {
    AD_ATTRIBUTION_POLICY_PRIORITY
} from '@duckduckgo/ddg2dnr/lib/rulePriorities'

import {
    generateDNRRule
} from '@duckduckgo/ddg2dnr/lib/utils'

const { getFeatureSettings, getBaseDomain } = require('../utils')
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
 * @typedef { import('./tab').Tab } Tab
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

        const adClick = new AdClick(this.navigationExpiration, this.totalExpiration, this.allowlist)

        if (manifestVersion === 3) {
            adClick.createDNR(tab.id)
        }

        if (linkFormat.adDomainParameterName) {
            const parameterDomain = resourceURL.searchParams.get(linkFormat.adDomainParameterName)
            if (parameterDomain && this.domainDetectionEnabled) {
                const parsedParameterDomain = getBaseDomain(parameterDomain)
                if (parsedParameterDomain) {
                    adClick.setAdBaseDomain(parsedParameterDomain)
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
    constructor (navigationExpiration, totalExpiration, allowlist) {
        /** @type {string | null} */
        this.adBaseDomain = null
        this.adClickRedirect = false
        this.navigationExpiration = navigationExpiration
        this.totalExpiration = totalExpiration
        this.expires = Date.now() + (this.totalExpiration * 1000)
        this.clickExpires = Date.now() + (this.navigationExpiration * 1000)
        this.allowlist = allowlist
        this.adClickDNR = null
    }

    clone () {
        const adClick = new AdClick(this.navigationExpiration, this.totalExpiration, this.allowlist)
        adClick.adBaseDomain = this.adBaseDomain
        adClick.adClickRedirect = this.adClickRedirect
        adClick.expires = this.expires
        adClick.clickExpires = Date.now() + (this.navigationExpiration * 1000)
        adClick.adClickDNR = this.adClickDNR
        return adClick
    }

    /**
     * Propagate an adclick to a new tab, used when a user navigates to a new tab.
     * @param {number} tabId
     * @returns {AdClick} adClick
     */
    propagate (tabId) {
        const adClick = this.clone()

        if (this.adClickDNR) {
            this.createDNR(tabId)
        }

        return adClick
    }

    static restore (adClick) {
        const restoredAdClick = new AdClick(adClick.navigationExpiration, adClick.totalExpiration, adClick.allowlist)
        restoredAdClick.adBaseDomain = adClick.adBaseDomain
        restoredAdClick.adClickRedirect = adClick.adClickRedirect
        restoredAdClick.expires = adClick.expires
        restoredAdClick.clickExpires = adClick.clickExpires
        restoredAdClick.adClickDNR = adClick.adClickDNR
        return restoredAdClick
    }

    /**
     * @param {string} domain
     **/
    setAdBaseDomain (domain) {
        this.adBaseDomain = domain
        this.adClickRedirect = false

        if (this.adClickDNR) {
            this.updateDNRInitiator(domain)
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
            this.removeDNR()
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

    getAdClickDNR (tabId) {
        const adClickDNR = {
            rule: generateDNRRule({
                id: null,
                priority: AD_ATTRIBUTION_POLICY_PRIORITY,
                actionType: 'allow',
                requestDomains: this.allowlist.map((entry) => entry.host)
            })
        }
        adClickDNR.rule.condition.tabIds = [tabId]
        return adClickDNR
    }

    updateDNRInitiator (domain) {
        if (this.adClickDNR && domain) {
            this.adClickDNR.rule.condition.initiatorDomains = [domain]
            this.updateDNR()
        }
    }

    createDNR (tabId) {
        this.adClickDNR = this.getAdClickDNR(tabId)
        this.adClickDNR.rule.id = getNextSessionRuleId()
        chrome.declarativeNetRequest.updateSessionRules({ addRules: [this.adClickDNR.rule] })
    }

    updateDNR () {
        if (this.adClickDNR) {
            chrome.declarativeNetRequest.updateSessionRules({
                removeRuleIds: [this.adClickDNR.rule.id],
                addRules: [this.adClickDNR.rule]
            })
        }
    }

    removeDNR () {
        if (this.adClickDNR) {
            chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [this.adClickDNR.rule.id] })
        }
    }
}
