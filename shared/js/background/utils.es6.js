const tldjs = require('tldjs')
const browserWrapper = require('./$BROWSER-wrapper.es6')

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
    browserWrapper.syncToStorage(data)
}

function getFromStorage (key, callback) {
    browserWrapper.getFromStorage(key, callback)
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

function setBadgeIcon (path, target) {
    browserWrapper.setBadgeIcon(path, target)
}

function getExtensionURL (path) {
    return browserWrapper.getExtensionURL(path)
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
    setBadgeIcon: setBadgeIcon,
    getExtensionURL: getExtensionURL
}
