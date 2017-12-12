// npm module defined in tldjs.js
let tldjs

require.scopes.utils = ( () => {

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
        const rgx = uaString.match(/(Firefox|Chrome)\/([0-9]+)/)
        return {
            browser: rgx[1],
            majorVersion: rgx[2]
        }
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
        extractTopSubdomainFromHost: extractTopSubdomainFromHost,
        parseUserAgentString: parseUserAgentString,
        syncToStorage: syncToStorage,
        getFromStorage: getFromStorage,
        getCurrentURL: getCurrentURL,
        getCurrentTab: getCurrentTab,
        getProtocol: getProtocol
    }
})();
