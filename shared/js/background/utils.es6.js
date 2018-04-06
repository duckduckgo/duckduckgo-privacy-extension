const tldjs = require('tldjs')
const load = require('./load.es6')
const settings = require('./settings.es6')
const entityMap = require('../../data/tracker_lists/entityMap')

function extractHostFromURL (url) {
    if (!url) return;

    let urlObj = tldjs.parse(url);
    let hostname = urlObj.hostname;
    hostname = hostname.replace(/^www\./,'');
    return hostname;
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
    if (!entityMap || url.length < 2) return
    let joinURL = url.join('.')
    if (entityMap[joinURL]) {
        return entityMap[joinURL]
    } else {
        url.shift()
        return findParent(url)
    }
}

function getProtocol (url){
    var a = document.createElement('a');
    a.href = url;
    return a.protocol;
}

function parseUserAgentString (uaString) {
    if (!uaString) uaString = window.navigator.userAgent
    const rgx = uaString.match(/(Firefox|Chrome|Safari)\/([0-9]+)/)
    return {
        browser: rgx[1],
        version: rgx[2]
    }
}

function isChromeBrowser () {
    const ua = parseUserAgentString()
    if (ua.browser === 'Chrome') return true
    return false
}

function syncToStorage (data){
    chrome.storage.local.set(data, function() { });
}

function getFromStorage (key, callback) {
    chrome.storage.local.get(key, function (result) {
        callback(result[key])
    })
}

function getCurrentURL(callback){
    chrome.tabs.query({"active": true, "lastFocusedWindow": true}, function(tabData) {
        if(tabData.length){
            callback(tabData[0].url)
        }
    });
}

function getCurrentTab(callback){
    return new Promise( (resolve, reject) => {
        chrome.tabs.query({"active": true, "lastFocusedWindow": true}, function(tabData) {
            if(tabData.length){
                resolve(tabData[0])
            }
        });
    })
}

// Set browser for popup asset paths
// chrome doesn't have getBrowserInfo so we'll default to chrome
// and try to detect if this is firefox
var browser = 'chrome'
try {
    chrome.runtime.getBrowserInfo((info) => {
        if (info.name === 'Firefox') browser = 'moz'
    })
} catch (e) {}

function getBrowserName() {
    return browser
}

module.exports = {
    extractHostFromURL: extractHostFromURL,
    extractTopSubdomainFromHost: extractTopSubdomainFromHost,
    parseUserAgentString: parseUserAgentString,
    isChromeBrowser: isChromeBrowser,
    syncToStorage: syncToStorage,
    getFromStorage: getFromStorage,
    getCurrentURL: getCurrentURL,
    getCurrentTab: getCurrentTab,
    getProtocol: getProtocol,
    getBrowserName: getBrowserName,
    findParent: findParent
}
