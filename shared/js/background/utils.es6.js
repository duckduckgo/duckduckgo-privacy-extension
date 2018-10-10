const tldjs = require('tldjs')
const entityMap = require('../../data/tracker_lists/entityMap')
const constants = require('../../data/constants')

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

// Get browser name for popup asset paths 
// and beacon vs ping request type
function getBrowserName () {
    let uaString = window.navigator.userAgent
    let browserName = 'chrome'
    try {
        if (uaString.match(/(Firefox)/)) {
            browserName = 'moz'
        }
    } catch (e) {}

    return browserName
}

// Determine if upgradeToSecure supported (firefox 59+)
// Chrome doesn't have getBrowserInfo so we'll default to Chrome
// and try to detect if this is Firefox.
function getUpgradeToSecureSupport () {
    let canUpgrade = false
    if (getBrowserName() !== 'moz') return canUpgrade

    let uaString = window.navigator.userAgent
    try {
        const browserVersion = uaString.match(/([0-9]+)/)
        if (browserVersion >= 59) {
            canUpgrade = true
        }
    } catch (e) {}

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
    getUpdatedRequestListenerTypes
}
