const tldjs = require('tldjs')
const entityMap = require('../../data/tracker_lists/entityMap')
const constants = require('../../data/constants')
const parseUserAgentString = require('../shared-utils/parse-user-agent-string.es6')
const browserInfo = parseUserAgentString()

function extractHostFromURL (url, shouldKeepWWW) {
    if (!url) return ''

    let urlObj = tldjs.parse(url)
    let hostname = urlObj.hostname || ''

    if (!shouldKeepWWW) {
        hostname = hostname.replace(/^www\./, '')
    }

    return hostname
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

        if (entityMap[joinURL]) {
            return entityMap[joinURL]
        }
        parts.shift()
    }
}

function getProtocol (url) {
    var a = document.createElement('a')
    a.href = url
    return a.protocol
}

function getCurrentURL (callback) {
    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabData) {
        if (tabData.length) {
            callback(tabData[0].url)
        }
    })
}

function getCurrentTab (callback) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabData) {
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
        'chrome': 'ping',
        'moz': 'beacon'
    }

    return beaconNamesByBrowser[getBrowserName()]
}

// Return requestListenerTypes + beacon or ping
function getUpdatedRequestListenerTypes () {
    let requestListenerTypes = constants.requestListenerTypes.slice()
    requestListenerTypes.push(getBeaconName())

    return requestListenerTypes
}

module.exports = {
    extractHostFromURL: extractHostFromURL,
    extractTopSubdomainFromHost: extractTopSubdomainFromHost,
    getCurrentURL: getCurrentURL,
    getCurrentTab: getCurrentTab,
    getProtocol: getProtocol,
    getBrowserName: getBrowserName,
    getUpgradeToSecureSupport: getUpgradeToSecureSupport,
    findParent: findParent,
    getBeaconName: getBeaconName,
    getUpdatedRequestListenerTypes: getUpdatedRequestListenerTypes
}
