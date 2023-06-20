import * as tldts from 'tldts'
import parseUserAgentString from '../shared-utils/parse-user-agent-string'
import sha1 from '../shared-utils/sha1'
const browserInfo = parseUserAgentString()

export class Utils {
    /**
     * @param {import("./storage/tds").TDSStorage} tdsStorage
     * @param {import("./wrapper").BrowserWrapper} browser
     * @param {import("./settings").Settings} settings
     */
    constructor (tdsStorage, browser, settings) {
        this.tdsStorage = tdsStorage
        this.browser = browser
        this.settings = settings
    }
    /**
     */
    async getSessionKey () {
        let sessionKey = await this.browser.getFromSessionStorage('sessionKey')
        if (!sessionKey) {
            sessionKey = await this.resetSessionKey(this.browser)
        }
        return sessionKey
    }
    /**
     * @param {import("./wrapper").BrowserWrapper} browser
     * @return {Promise<*>}
     */
    async resetSessionKey (browser) {
        const sessionKey = sha1(getRandomFloat().toString())
        await browser.setToSessionStorage('sessionKey', sessionKey)
        return sessionKey
    }
    async sendTabMessage (id, message, details) {
        try {
            await this.browser.tabs.sendMessage(id, message, details)
        } catch {
            // Ignore errors
        }
    }

    async sendAllTabsMessage (message, details) {
        try {
            for (const { id: tabId } of await this.browser.tabs.query({})) {
                this.sendTabMessage(tabId, message, details)
            }
        } catch {
            // Ignore errors
        }
    }

    // pull off subdomains and look for parent companies
    findParent (url) {
        const parts = extractHostFromURL(url).split('.')

        while (parts.length > 1) {
            const joinURL = parts.join('.')

            // check if tracker owner has 'ownedBy' to indicate a parent.
            if (this.tdsStorage.tds.trackers[joinURL]?.owner?.ownedBy) {
                return this.tdsStorage.tds.trackers[joinURL].owner.ownedBy
            } else if (this.tdsStorage.tds.domains[joinURL]) {
                return this.tdsStorage.tds.domains[joinURL]
            }
            parts.shift()
        }
    }

    /**
     * There are situations where we want to access the parent's displayName
     * only - for instance in the NewtabTrackerStats feature.
     * @param {string} url
     * @returns {string}
     */
    findParentDisplayName (url) {
        const parent = this.findParent(url)
        const entity = this.tdsStorage.tds.entities[parent]

        if (entity && entity.displayName) {
            return entity.displayName
        }

        return 'unknown'
    }
    /*
 * check to see if this is a broken site reported on github
*/
    isBroken (url) {
        if (!this.tdsStorage?.config.unprotectedTemporary) return
        return this.brokenListIndex(url, this.tdsStorage?.config.unprotectedTemporary) !== -1
    }

    removeBroken (domain) {
        const index = this.brokenListIndex(domain, this.tdsStorage.config.unprotectedTemporary)
        if (index !== -1) {
            console.log('remove', this.tdsStorage.config.unprotectedTemporary.splice(index, 1))
        }
    }

    getEnabledFeaturesAboutBlank (url) {
        if (!this.tdsStorage.config.features) return []
        const enabledFeatures = []
        for (const feature in this.tdsStorage.config.features) {
            const featureSettings = this.getFeatureSettings(feature)

            if (featureSettings.aboutBlankEnabled !== 'disabled' && this.brokenListIndex(url, featureSettings.aboutBlankSites || []) === -1) {
                enabledFeatures.push(feature)
            }
        }
        return enabledFeatures
    }

    /**
     * @param {import("./wrapper").BrowserWrapper} browser
     * @param url
     * @return {*[]}
     */
    getEnabledFeatures (browser, url) {
        if (!this.tdsStorage.config.features) return []
        const enabledFeatures = []
        for (const feature in this.tdsStorage.config.features) {
            if (this.isFeatureEnabled(feature) && this.brokenListIndex(url, this.tdsStorage.config.features[feature].exceptions || []) === -1) {
                enabledFeatures.push(feature)
            }
        }
        return enabledFeatures
    }

    brokenListIndex (url, list) {
        const parsedDomain = tldts.parse(url)
        const hostname = parsedDomain.hostname || url

        // If root domain in temp unprotected list, return true
        return list.findIndex((brokenSiteDomain) => {
            if (brokenSiteDomain.domain) {
                return hostname === brokenSiteDomain.domain ||
                    hostname.endsWith(`.${brokenSiteDomain.domain}`)
            }
            return false
        })
    }

// We inject this into content scripts
    getBrokenScriptLists () {
        const brokenScripts = {}
        for (const key in this.tdsStorage.config.features) {
            const featureSettings = this.getFeatureSettings(key)
            brokenScripts[key] = featureSettings.scripts?.map(obj => obj.domain) || []
        }
        return brokenScripts
    }

    /**
     * Checks the config to see if a feature is enabled. You can optionally pass a second "customState"
     * parameter to check if the state is equeal to other states (i.e. state === 'beta').
     *
     * @param {String} featureName - the name of the feature
     * @returns {boolean} - if feature is enabled
     */
    isFeatureEnabled (featureName) {
        const feature = this.tdsStorage.tds.config.features[featureName]
        if (!feature) {
            return false
        }

        // If we have a supplied min version for the feature ensure the extension meets it
        if ('minSupportedVersion' in feature) {
            const extensionVersionString = this.browser.getExtensionVersion()
            if (!satisfiesMinVersion(feature.minSupportedVersion, extensionVersionString)) {
                return false
            }
        }

        return feature.state === 'enabled'
    }

    /**
     * Returns the settings object associated with featureName in the config
     *
     * @param {String} featureName - the name of the feature
     * @returns {Object} - Settings associated in the config with featureName
     */
    getFeatureSettings (featureName) {
        const feature = this.tdsStorage.tds.config.features[featureName]
        if (typeof feature !== 'object' || feature === null || !feature.settings) {
            return {}
        }

        return feature.settings
    }
    // return true if the given url is in the safelist. For checking if the current tab is in the safelist,
// tabManager.site.isProtectionEnabled() is the preferred method.
    isSafeListed (url) {
        const hostname = extractHostFromURL(url)
        const safeList = this.settings.getSetting('allowlisted')
        const subdomains = hostname.split('.')
        // Check user safe list
        // TODO make the same as brokenListIndex matching
        while (subdomains.length > 1) {
            if (safeList && safeList[subdomains.join('.')]) {
                return true
            }
            subdomains.shift()
        }

        // Check broken sites
        if (this.isBroken(hostname)) {
            return true
        }

        return false
    }

    isCookieExcluded (url) {
        const domain = (new URL(url)).host
        return this.isDomainCookieExcluded(domain)
    }

    isDomainCookieExcluded (domain) {
        const cookieSettings = this.getFeatureSettings('cookie')
        if (!cookieSettings || !cookieSettings.excludedCookieDomains) {
            return false
        }

        if (cookieSettings.excludedCookieDomains.find(elem => elem.domain === domain)) {
            return true
        }

        const comps = domain.split('.')
        if (comps.length > 2) {
            comps.shift()
            return this.isDomainCookieExcluded(comps.join('.'))
        }

        return false
    }
    /**
     * Checks if the extension was installed within days of the from date
     * @param {number} numberOfDays
     * @param {number} [fromDate]
     * @param {string} [atb]
     * @returns {boolean}
     */
    isInstalledWithinDays (numberOfDays, fromDate = Date.now(), atb = this.settings.getSetting('atb')) {
        return this.daysInstalled(fromDate, atb) <= numberOfDays
    }

    /**
     * Returns the days since installed using atb
     * @param {number} [fromDate]
     * @param {string} [atb]
     * @returns {number}
     */
    daysInstalled (fromDate = Date.now(), atb = this.settings.getSetting('atb')) {
        if (!atb) return NaN

        const installTimestamp = getInstallTimestamp(atb)
        // If we can't get the install date, assume it wasn't installed in time period
        if (!installTimestamp) return NaN

        return (fromDate - installTimestamp) / dayMultiplier
    }

    getCurrentURL (callback) {
        this.browser.tabs.query({ active: true, lastFocusedWindow: true }).then((tabData) => {
            if (tabData.length) {
                callback(tabData[0].url)
            }
        })
    }

    async getCurrentTab (callback) {
        const tabData = await this.browser.tabs.query({ active: true, lastFocusedWindow: true })
        if (tabData.length) {
            return tabData[0]
        }
    }

    async reloadCurrentTab () {
        const tab = await this.getCurrentTab()
        if (tab && tab.id) {
            this.browser.tabs.reload(tab.id)
        }
    }
}
/**
 * Produce a random float, matches the output of Math.random() but much more cryptographically psudo-random.
 * @returns {number}
 */
function getRandomFloat () {
    return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
}


/**
 * @param {string} urlString
 * @returns {string | null} etld plus one of the URL
 */
export function getBaseDomain (urlString) {
    const parsedUrl = tldts.parse(urlString, { allowPrivateDomains: true })
    if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname?.endsWith('.localhost') || parsedUrl.isIp) {
        return parsedUrl.hostname
    }
    return parsedUrl.domain
}

export function extractHostFromURL (url, shouldKeepWWW) {
    if (!url) return ''

    // Tweak the URL for Firefox about:* pages to ensure that they are parsed
    // correctly. For example, 'about:example' becomes 'about://example'.
    if (url.startsWith('about:') && url[6] !== '/') {
        url = 'about://' + url.substr(6)
    }

    const urlObj = tldts.parse(url)
    let hostname = urlObj.hostname || ''

    if (!shouldKeepWWW) {
        hostname = hostname.replace(/^www\./, '')
    }

    return hostname
}

// Removes information from a URL, such as path, user information, and optionally sub domains
// @ts-ignore
export function extractLimitedDomainFromURL (url, { keepSubdomains } = {}) {
    if (!url) return undefined
    try {
        const parsedURL = new URL(url)
        const tld = tldts.parse(url)
        if (!parsedURL || !tld) return ''
        // tld.domain is null if this is an IP or the domain does not use a known TLD (e.g. localhost)
        // in that case use the hostname (no truncation)
        let finalURL = tld.domain || tld.hostname
        if (keepSubdomains) {
            finalURL = tld.hostname
        } else if (tld.subdomain && tld.subdomain.toLowerCase() === 'www') {
            // This is a special case where if a domain requires 'www' to work
            // we keep it, even if we wouldn't normally keep subdomains.
            // note that even mutliple subdomains like www.something.domain.com has
            // subdomain of www.something, and wouldn't trigger this case.
            finalURL = 'www.' + tld.domain
        }
        const port = parsedURL.port ? `:${parsedURL.port}` : ''

        return `${parsedURL.protocol}//${finalURL}${port}/`
    } catch (e) {
        // tried to parse invalid URL, such as an extension URL. In this case, don't modify anything
        return undefined
    }

}

export function extractTopSubdomainFromHost (host) {
    if (typeof host !== 'string') return false
    const rgx = /\./g
    // @ts-ignore
    if (host.match(rgx) && host.match(rgx).length > 1) {
        return host.split('.')[0]
    }
    return false
}



// Browser / Version detection
// Get correct name for fetching UI assets
export function getBrowserName () {
    if (!browserInfo || !browserInfo.browser) return

    let browserName = browserInfo.browser.toLowerCase()
    if (browserName === 'firefox') browserName = 'moz'

    return browserName
}

export function getOsName () {
    if (!browserInfo || !browserInfo.os) return
    return browserInfo.os
}

// Determine if upgradeToSecure supported (Firefox 59+)
export function getUpgradeToSecureSupport () {
    let canUpgrade = false
    if (getBrowserName() !== 'moz') return canUpgrade

    if (browserInfo && browserInfo.version >= 59) {
        canUpgrade = true
    }

    return canUpgrade
}

// return true if browser allows to handle request async
export function getAsyncBlockingSupport () {
    const browserName = getBrowserName()

    if (browserName === 'moz' && browserInfo && browserInfo.version >= 52) {
        return true
    } else if (['edg', 'edge', 'brave', 'chrome'].includes(browserName)) {
        return false
    }

    console.warn(`Unrecognized browser "${browserName}" - async response disallowed`)
    return false
}

/**
 * @param {number} statusCode
 * @returns {boolean}
 */
export function isRedirect (statusCode) {
    return (statusCode >= 300 && statusCode <= 399)
}


/**
 * Tests whether the two URL's belong to the same
 * top level domain.
 */
export function isSameTopLevelDomain (url1, url2) {
    const first = getBaseDomain(url1)
    const second = getBaseDomain(url2)

    if (!first || !second) {
        return false
    }

    return first === second
}

export function parseVersionString (versionString) {
    return versionString.split('.').map(Number)
}

export function satisfiesMinVersion (minVersionString, extensionVersionString) {
    const minVersions = parseVersionString(minVersionString)
    const currentVersions = parseVersionString(extensionVersionString)
    const maxLength = Math.max(minVersions.length, currentVersions.length)
    for (let i = 0; i < maxLength; i++) {
        const minNumberPart = minVersions[i] || 0
        const currentVersionPart = currentVersions[i] || 0
        if (currentVersionPart > minNumberPart) {
            return true
        }
        if (currentVersionPart < minNumberPart) {
            return false
        }
    }
    return true
}

/**
 * Strips off a query string from the URL
 * @param {string} urlString
 * @returns {string}
 */
export function getURLWithoutQueryString (urlString) {
    return urlString?.split('?')[0]
}



const dayMultiplier = 24 * 60 * 60 * 1000

/**
 * Converts ATB value into date
 * @param {string} atb
 * @returns {number|null}
 */
export function getInstallTimestamp (atb) {
    const match = atb.match(/^v?(\d+)-(\d)(.+)?$/i)
    if (!match) return null

    const startDate = 1456272000000
    const weeksSince = (parseInt(match[1], 10) - 1) * 7 * dayMultiplier
    const daysSince = (parseInt(match[2], 10) - 1) * dayMultiplier
    const installTimestamp = new Date(startDate + weeksSince + daysSince).getTime()
    return isNaN(installTimestamp) ? null : installTimestamp
}

