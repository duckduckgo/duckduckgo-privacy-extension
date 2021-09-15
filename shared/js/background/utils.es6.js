import browser from 'webextension-polyfill'
import tdsStorage from './storage/tds.es6'
import settings from './settings.es6'
import load from './load.es6'
import * as tldts from 'tldts'
import constants from '../../data/constants'
import parseUserAgentString from '../shared-utils/parse-user-agent-string.es6'
const browserInfo = parseUserAgentString()

export function sendTabMessage (id, message, details) {
    try {
        browser.tabs.sendMessage(id, message, details)
    } catch {
        // Ignore errors
    }
}

export function extractHostFromURL (url, shouldKeepWWW) {
    if (!url) return ''

    const urlObj = tldts.parse(url)
    let hostname = urlObj.hostname || ''

    if (!shouldKeepWWW) {
        hostname = hostname.replace(/^www\./, '')
    }

    return hostname
}

// Removes information from a URL, such as path, user information, and optionally sub domains
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

        if (tdsStorage.tds.domains[joinURL]) {
            return tdsStorage.tds.domains[joinURL]
        }
        parts.shift()
    }
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

    let browser = browserInfo.browser.toLowerCase()
    if (browser === 'firefox') browser = 'moz'

    return browser
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

// Chrome errors with 'beacon', but supports 'ping'
// Firefox only blocks 'beacon' (even though it should support 'ping')
export function getBeaconName () {
    const beaconNamesByBrowser = {
        chrome: 'ping',
        moz: 'beacon',
        edg: 'ping',
        brave: 'ping',
        default: 'ping'
    }
    let name = getBrowserName()
    if (!Object.keys(beaconNamesByBrowser).includes(name)) {
        name = 'default'
    }
    return beaconNamesByBrowser[name]
}

// Return requestListenerTypes + beacon or ping
export function getUpdatedRequestListenerTypes () {
    const requestListenerTypes = constants.requestListenerTypes.slice()
    requestListenerTypes.push(getBeaconName())

    return requestListenerTypes
}

// return true if browser allows to handle request async
export function getAsyncBlockingSupport () {
    const browser = getBrowserName()

    if (browser === 'moz' && browserInfo && browserInfo.version >= 52) {
        return true
    } else if (['edg', 'edge', 'brave', 'chrome'].includes(browser)) {
        return false
    }

    console.warn(`Unrecognized browser "${browser}" - async response disallowed`)
    return false
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

export function getBrokenFeaturesAboutBlank (url) {
    if (!tdsStorage.config.features) return
    const brokenFeatures = []
    for (const feature in tdsStorage.config.features) {
        const featureSettings = getFeatureSettings(feature)

        if (featureSettings.aboutBlankEnabled === 'disabled') {
            brokenFeatures.push(feature)
        }
        if (brokenListIndex(url, featureSettings.aboutBlankSites || []) !== -1) {
            brokenFeatures.push(feature)
        }
    }
    return brokenFeatures
}

export function getBrokenFeatures (url) {
    if (!tdsStorage.config.features) return
    const brokenFeatures = []
    for (const feature in tdsStorage.config.features) {
        if (!isFeatureEnabled(feature)) {
            brokenFeatures.push(feature)
        }
        if (brokenListIndex(url, tdsStorage.config.features[feature].exceptions || []) !== -1) {
            brokenFeatures.push(feature)
        }
    }
    return brokenFeatures
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

export function isFeatureBrokenForURL (url, feature) {
    const exceptionList = tdsStorage.config.features[feature]?.exceptions
    if (!exceptionList || exceptionList.length === 0) {
        return false
    }

    return brokenListIndex(url, exceptionList) !== -1
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
    const cookieSettings = getFeatureSettings('trackingCookies3p')
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
 * Convert an image file to a base64 data:image file,
 * for use in injections where the extension URL may not be
 * accessible
 */
export async function imgToData (imagePath) {
    const imgType = imagePath.substring(imagePath.lastIndexOf('.') + 1)
    try {
        const options = {
            url: imagePath,
            type: 'internal'
        }
        if (imgType !== 'svg') {
            options.responseType = 'arraybuffer'
            options.returnType = 'arraybuffer'
        }
        const xhrRes = await load.loadExtensionFile(options)
        const imgData = xhrRes.data
        if (imgType === 'svg') {
            return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(imgData)}`
        }
        // Based on https://stackoverflow.com/questions/9267899/arraybuffer-to-base64-encoded-string/9458996#9458996
        let binary = ''
        const bytes = new Uint8Array(imgData)
        for (const i of bytes) {
            binary += String.fromCharCode(i)
        }
        return `data:image/${imgType};base64,${btoa(binary)}`
    } catch (e) {
        console.error('Could not load image file to process: ' + e)
    }
}

/**
 * Tests whether the two URL's belong to the same
 * top level domain.
 */
export function isSameTopLevelDomain (url1, url2) {
    const first = tldts.parse(url1, { allowPrivateDomains: true })
    const second = tldts.parse(url2, { allowPrivateDomains: true })

    const firstDomain = first.domain === null ? first.hostname : first.domain
    const secondDomain = first.domain === null ? second.hostname : second.domain

    return firstDomain === secondDomain
}

/**
 * Checks the config to see if a feature is enabled. You can optionally pass a second "customState"
 * parameter to check if the state is equeal to other states (i.e. state === 'beta').
 *
 * @param {String} featureName - the name of the feature
 * @param {String} customState - An optional custom state to check for
 * @returns {bool} - if feature is enabled
 */
function isFeatureEnabled (featureName) {
    const feature = tdsStorage.config.features[featureName]
    if (!feature) {
        return false
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
