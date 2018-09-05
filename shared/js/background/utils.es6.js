const tldjs = require('tldjs')
const entityMap = require('../../data/tracker_lists/entityMap')

function extractHostFromURL (url, shouldKeepWWW) {
    if (!url) return

    let urlObj = tldjs.parse(url)
    let hostname = urlObj.hostname

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
    if (typeof url !== 'object') {
        url = url.split('.')
    }

    if (!entityMap || url.length < 2) return
    let joinURL = url.join('.')
    if (entityMap[joinURL]) {
        return entityMap[joinURL]
    } else {
        url.shift()
        return findParent(url)
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
// 1. Set browser for popup asset paths
// 2. Determine if upgradeToSecure supported (firefox 59+)
// chrome doesn't have getBrowserInfo so we'll default to chrome
// and try to detect if this is firefox.

var browser = 'chrome'
var upgradeToSecureSupport = false

try {
    chrome.runtime.getBrowserInfo((info) => {
        if (info.name === 'Firefox') {
            browser = 'moz'

            var browserVersion = info.version.match(/^(\d+)/)[1]
            if (browserVersion >= 59) {
                upgradeToSecureSupport = true
            }
        }
    })
} catch (e) {}

function getBrowserName () {
    return browser
}

function getUpgradeToSecureSupport () {
    return upgradeToSecureSupport
}

module.exports = {
    extractHostFromURL: extractHostFromURL,
    extractTopSubdomainFromHost: extractTopSubdomainFromHost,
    getCurrentURL: getCurrentURL,
    getCurrentTab: getCurrentTab,
    getProtocol: getProtocol,
    getBrowserName: getBrowserName,
    getUpgradeToSecureSupport: getUpgradeToSecureSupport,
    findParent: findParent
}
