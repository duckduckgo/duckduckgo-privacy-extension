import browser from 'webextension-polyfill'
import { getExtensionVersion, getFromSessionStorage, setToSessionStorage } from './wrapper'
import tdsStorage from './storage/tds'
import settings from './settings'
import * as tldts from 'tldts'
import parseUserAgentString from '../shared-utils/parse-user-agent-string'
import sha1 from '../shared-utils/sha1'
const browserInfo = parseUserAgentString()

/**
 * Produce a random float, matches the output of Math.random() but much more cryptographically psudo-random.
 * @returns {number}
 */
function getRandomFloat () {
    return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
}

export async function getSessionKey () {
    let sessionKey = await getFromSessionStorage('sessionKey')
    if (!sessionKey) {
        sessionKey = await resetSessionKey()
    }
    return sessionKey
}

export async function resetSessionKey () {
    const sessionKey = sha1(getRandomFloat().toString())
    await setToSessionStorage('sessionKey', sessionKey)
    return sessionKey
}

export async function sendTabMessage (id, message, details) {
    try {
        await browser.tabs.sendMessage(id, message, details)
    } catch {
        // Ignore errors
    }
}

export async function sendAllTabsMessage (message, details) {
    try {
        for (const { id: tabId } of await browser.tabs.query({})) {
            sendTabMessage(tabId, message, details)
        }
    } catch {
        // Ignore errors
    }
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

// pull off subdomains and look for parent companies
export function findParent (url) {
    const parts = extractHostFromURL(url).split('.')

    while (parts.length > 1) {
        const joinURL = parts.join('.')

        // check if tracker owner has 'ownedBy' to indicate a parent.
        if (tdsStorage.tds.trackers[joinURL]?.owner?.ownedBy) {
            return tdsStorage.tds.trackers[joinURL].owner.ownedBy
        } else if (tdsStorage.tds.domains[joinURL]) {
            return tdsStorage.tds.domains[joinURL]
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
export function findParentDisplayName (url) {
    const parent = findParent(url)
    const entity = tdsStorage.tds.entities[parent]

    if (entity && entity.displayName) {
        return entity.displayName
    }

    return 'unknown'
}

export function getCurrentURL (callback) {
    browser.tabs.query({ active: true, lastFocusedWindow: true }).then((tabData) => {
        if (tabData.length) {
            callback(tabData[0].url)
        }
    })
}

export async function getCurrentTab (callback) {
    const tabData = await browser.tabs.query({ active: true, lastFocusedWindow: true })
    if (tabData.length) {
        return tabData[0]
    }
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

/*
 * check to see if this is a broken site reported on github
*/
export function isBroken (url) {
    if (!tdsStorage?.config.unprotectedTemporary) return
    return brokenListIndex(url, tdsStorage?.config.unprotectedTemporary) !== -1
}

export function removeBroken (domain) {
    const index = brokenListIndex(domain, tdsStorage.config.unprotectedTemporary)
    if (index !== -1) {
        console.log('remove', tdsStorage.config.unprotectedTemporary.splice(index, 1))
    }
}

export function getEnabledFeaturesAboutBlank (url) {
    if (!tdsStorage.config.features) return []
    const enabledFeatures = []
    for (const feature in tdsStorage.config.features) {
        const featureSettings = getFeatureSettings(feature)

        if (featureSettings.aboutBlankEnabled !== 'disabled' && brokenListIndex(url, featureSettings.aboutBlankSites || []) === -1) {
            enabledFeatures.push(feature)
        }
    }
    return enabledFeatures
}

export function getEnabledFeatures (url) {
    if (!tdsStorage.config.features) return []
    const enabledFeatures = []
    for (const feature in tdsStorage.config.features) {
        if (isFeatureEnabled(feature) && brokenListIndex(url, tdsStorage.config.features[feature].exceptions || []) === -1) {
            enabledFeatures.push(feature)
        }
    }
    return enabledFeatures
}

export function brokenListIndex (url, list) {
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
export function getBrokenScriptLists () {
    const brokenScripts = {}
    for (const key in tdsStorage.config.features) {
        const featureSettings = getFeatureSettings(key)
        brokenScripts[key] = featureSettings.scripts?.map(obj => obj.domain) || []
    }
    return brokenScripts
}

// return true if the given url is in the safelist. For checking if the current tab is in the safelist,
// tabManager.site.isProtectionEnabled() is the preferred method.
export function isSafeListed (url) {
    const hostname = extractHostFromURL(url)
    const safeList = settings.getSetting('allowlisted')
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
    if (isBroken(hostname)) {
        return true
    }

    return false
}

export function isCookieExcluded (url) {
    const domain = (new URL(url)).host
    return isDomainCookieExcluded(domain)
}

function isDomainCookieExcluded (domain) {
    const cookieSettings = getFeatureSettings('cookie')
    if (!cookieSettings || !cookieSettings.excludedCookieDomains) {
        return false
    }

    if (cookieSettings.excludedCookieDomains.find(elem => elem.domain === domain)) {
        return true
    }

    const comps = domain.split('.')
    if (comps.length > 2) {
        comps.shift()
        return isDomainCookieExcluded(comps.join('.'))
    }

    return false
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
    const [major = 0, minor = 0, patch = 0] = versionString.split('.').map(Number)
    return {
        major,
        minor,
        patch
    }
}

export function satisfiesMinVersion (minVersionString, extensionVersionString) {
    const { major: minMajor, minor: minMinor, patch: minPatch } = parseVersionString(minVersionString)
    const { major, minor, patch } = parseVersionString(extensionVersionString)

    return (major > minMajor ||
            (major >= minMajor && minor > minMinor) ||
            (major >= minMajor && minor >= minMinor && patch >= minPatch))
}

/**
 * Checks the config to see if a feature is enabled. You can optionally pass a second "customState"
 * parameter to check if the state is equeal to other states (i.e. state === 'beta').
 *
 * @param {String} featureName - the name of the feature
 * @returns {boolean} - if feature is enabled
 */
export function isFeatureEnabled (featureName) {
    const feature = tdsStorage.config.features[featureName]
    if (!feature) {
        return false
    }

    // If we have a supplied min version for the feature ensure the extension meets it
    if ('minSupportedVersion' in feature) {
        const extensionVersionString = getExtensionVersion()
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
export function getFeatureSettings (featureName) {
    const feature = tdsStorage.config.features[featureName]
    if (typeof feature !== 'object' || feature === null || !feature.settings) {
        return {}
    }

    return feature.settings
}

/**
 * Strips off a query string from the URL
 * @param {string} urlString
 * @returns {string}
 */
export function getURLWithoutQueryString (urlString) {
    return urlString?.split('?')[0]
}

export async function reloadCurrentTab () {
    const tab = await getCurrentTab()
    if (tab && tab.id) {
        browser.tabs.reload(tab.id)
    }
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

/**
 * Checks if the extension was installed within days of the from date
 * @param {number} numberOfDays
 * @param {number} [fromDate]
 * @param {string} [atb]
 * @returns {boolean}
 */
export function isInstalledWithinDays (numberOfDays, fromDate = Date.now(), atb = settings.getSetting('atb')) {
    if (!atb) return false

    const installTimestamp = getInstallTimestamp(atb)
    // If we can't get the install date, assume it wasn't installed in time period
    if (!installTimestamp) return false

    const daysInstalled = (fromDate - installTimestamp) / dayMultiplier
    return daysInstalled <= numberOfDays
}
