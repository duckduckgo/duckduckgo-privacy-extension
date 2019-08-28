const tldjs = require('tldjs')
const tdsStorage = require('./storage/tds.es6')
const constants = require('../../data/constants')
const parseUserAgentString = require('../shared-utils/parse-user-agent-string.es6')
const browserInfo = parseUserAgentString()

/* Check to see if a company is related to a domain.
 * @param {string} entity - company name
 * @param {string} domain - domain or url
 */
function isRelatedEntity (entityName, domain) {
    var parentEntity = tdsStorage.tds.entities[entityName]
    var host = extractHostFromURL(domain)

    if (parentEntity && parentEntity.properties) {
    // join parent entities to use as regex and store in parentEntity so we don't have to do this again
        if (!parentEntity.regexProperties) {
            let propertyList = parentEntity.properties

            if (parentEntity.resources) {
                propertyList = propertyList.concat(parentEntity.resources)
            }

            parentEntity.regexProperties = new RegExp(propertyList.map(e => {
                // escape regex, add $ to match on end of domains
                return e.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&').replace(/$/, '$')
            }).join('|'))
        }

        if (parentEntity.regexProperties.test(host)) {
            return true
        }
    }

    return false
}

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

        if (tdsStorage.tds.domains[joinURL]) {
            return tdsStorage.tds.domains[joinURL]
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
    getUpdatedRequestListenerTypes: getUpdatedRequestListenerTypes,
    isRelatedEntity: isRelatedEntity
}
