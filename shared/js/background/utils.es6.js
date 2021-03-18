const tldts = require('tldts')
const tdsStorage = require('./storage/tds.es6')
const constants = require('../../data/constants')
const parseUserAgentString = require('../shared-utils/parse-user-agent-string.es6')
const browserInfo = parseUserAgentString()
const settings = require('./settings.es6')

function extractHostFromURL (url, shouldKeepWWW) {
    if (!url) return ''

    const urlObj = tldts.parse(url)
    let hostname = urlObj.hostname || ''

    if (!shouldKeepWWW) {
        hostname = hostname.replace(/^www\./, '')
    }

    return hostname
}

// Removes information from a URL, such as path, user information, and optionally sub domains
function extractLimitedDomainFromURL (url, { keepSubdomains } = {}) {
    if (!url) return undefined
    try {
        const parsedURL = new URL(url)
        const tld = tldts.parse(url)
        if (!parsedURL || !tld) return ''
        let finalURL = tld.domain
        if (keepSubdomains) {
            finalURL = tld.hostname
        } else if (tld.subdomain && tld.subdomain.toLowerCase() === 'www') {
            // This is a special case where if a domain requires 'www' to work
            // we keep it, even if we wouldn't normally keep subdomains.
            // note that even mutliple subdomains like www.something.domain.com has
            // subdomain of www.something, and wouldn't trigger this case.
            finalURL = 'www.' + tld.domain
        }

        return `${parsedURL.protocol}//${finalURL}/`
    } catch (e) {
        // tried to parse invalid URL, such as an extension URL. In this case, don't modify anything
        return undefined
    }
}

function extractTopSubdomainFromHost (host) {
    if (typeof host !== 'string') return false
    const rgx = /\./g
    if (host.match(rgx) && host.match(rgx).length > 1) {
        return host.split('.')[0]
    }
    return false
}

// pull off subdomains and look for parent companies
function findParent (url) {
    const parts = extractHostFromURL(url).split('.')

    while (parts.length > 1) {
        const joinURL = parts.join('.')

        if (tdsStorage.tds.domains[joinURL]) {
            return tdsStorage.tds.domains[joinURL]
        }
        parts.shift()
    }
}

function getCurrentURL (callback) {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabData) {
        if (tabData.length) {
            callback(tabData[0].url)
        }
    })
}

function getCurrentTab (callback) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabData) {
            if (tabData.length) {
                resolve(tabData[0])
            }
        })
    })
}

// Browser / Version detection
// Get correct name for fetching UI assets
function getBrowserName () {
    if (!browserInfo || !browserInfo.browser) return

    let browser = browserInfo.browser.toLowerCase()
    if (browser === 'firefox') browser = 'moz'

    return browser
}

// Determine if upgradeToSecure supported (Firefox 59+)
function getUpgradeToSecureSupport () {
    let canUpgrade = false
    if (getBrowserName() !== 'moz') return canUpgrade

    if (browserInfo && browserInfo.version >= 59) {
        canUpgrade = true
    }

    return canUpgrade
}

// Chrome errors with 'beacon', but supports 'ping'
// Firefox only blocks 'beacon' (even though it should support 'ping')
function getBeaconName () {
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
function getUpdatedRequestListenerTypes () {
    const requestListenerTypes = constants.requestListenerTypes.slice()
    requestListenerTypes.push(getBeaconName())

    return requestListenerTypes
}

// return true if browser allows to handle request async
function getAsyncBlockingSupport () {
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
function isBroken (url) {
    if (!tdsStorage?.brokenSiteList) return
    return isBrokenList(url, tdsStorage.brokenSiteList)
}

function getBrokenFeatures (url) {
    if (!tdsStorage?.fingerprinting) return
    const brokenFeatures = []
    for (const feature in tdsStorage.fingerprinting) {
        if (!tdsStorage.fingerprinting[feature]?.enabled) {
            brokenFeatures.push(feature)
        }
        if (isBrokenList(url, tdsStorage.fingerprinting[feature].sites || [])) {
            brokenFeatures.push(feature)
        }
    }
    return brokenFeatures
}

function isBrokenList (url, lists) {
    const parsedDomain = tldts.parse(url)
    const hostname = parsedDomain.hostname || url

    // If root domain in temp unprotected list, return true
    return lists.some((brokenSiteDomain) => {
        if (brokenSiteDomain) {
            return hostname.match(new RegExp(brokenSiteDomain + '$'))
        }
        return false
    })
}

// We inject this into content scripts
function getBrokenCanvasScriptList () {
    return tdsStorage?.fingerprinting?.canvas?.scripts || []
}

// return true if the given url is in the safelist. For checking if the current tab is in the safelist,
// tabManager.site.whitelisted is the preferred method.
function isSafeListed (url) {
    const hostname = extractHostFromURL(url)
    const safeList = settings.getSetting('whitelisted')
    const subdomains = hostname.split('.')
    // Check user safe list
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

module.exports = {
    extractHostFromURL,
    extractTopSubdomainFromHost,
    getCurrentURL,
    getCurrentTab,
    getBrowserName,
    getUpgradeToSecureSupport,
    getAsyncBlockingSupport,
    findParent,
    getBeaconName,
    getUpdatedRequestListenerTypes,
    isSafeListed,
    extractLimitedDomainFromURL,
    isBroken,
    getBrokenFeatures,
    getBrokenCanvasScriptList
}
