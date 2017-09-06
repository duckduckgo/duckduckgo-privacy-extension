// url-parse node module. Defined in url-parse.js
var URLParser;

require.scopes.utils = ( () => {

    function extractHostFromURL (url) {
        if (!url) return;

        let urlObj = new URLParser(url);
        let hostname = urlObj.hostname;
        hostname = hostname.replace(/^www\./,'');
        return hostname;
    }

    function extractSubdomainFromHost (host) {
         if (typeof host !== 'string') return false
         const rgx = /\./g
         if (host.match(rgx) && host.match(rgx).length > 1) {
             return host.split('.')[0]
         }
         return false
     }

    function parseURL (url){
        var a = document.createElement('a');
        a.href = url;
        return a;
    }

    function parseUserAgentString (uaString) {
        if (!uaString) uaString = window.navigator.userAgent
        const rgx = uaString.match(/(Firefox|Chrome)\/([0-9]+)/)
        return {
            browser: rgx[1],
            majorVersion: rgx[2]
        }
    }

    function syncToStorage (data){
        chrome.storage.local.set(data, function() { });
    }

    function getFromStorage (key, callback){
        chrome.storage.local.get(key, function(result){
            if(result[key]){
                callback(result[key]);
            }
        });
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

    chrome.runtime.onMessage.addListener( (req, sender, res) => {
        if (req.getCurrentTab) {
            getCurrentTab().then((tab) => {
                res(tab)
            })
        }
        return true;
    })

    return {
        extractHostFromURL: extractHostFromURL,
        extractSubdomainFromHost: extractSubdomainFromHost,
        parseURL: parseURL,
        parseUserAgentString: parseUserAgentString,
        syncToStorage: syncToStorage,
        getFromStorage: getFromStorage,
        getCurrentURL: getCurrentURL,
        getCurrentTab: getCurrentTab
    }
})();
