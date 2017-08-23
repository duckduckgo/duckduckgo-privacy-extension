
// url-parse node module. Defined in url-parse.js
var URLParser;

require.scopes.utils = ( () => {

    function extractHostFromURL(url) {
        if (!url) return;

        let urlObj = new URLParser(url);
        let hostname = urlObj.hostname;
        hostname = hostname.replace(/^www\./,'');
        return hostname;
    }

    function parseURL(url){
        var a = document.createElement('a');
        a.href = url;
        return a;
    }

    function syncToStorage(data){
        chrome.storage.local.set(data, function() {
        });
    }

    function getFromStorage(key, callback){
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

    var exports = {};
    exports.extractHostFromURL = extractHostFromURL;
    exports.syncToStorage = syncToStorage;
    exports.getFromStorage = getFromStorage;
    exports.getCurrentURL = getCurrentURL;
    exports.getCurrentTab = getCurrentTab;
    exports.parseURL = parseURL;
    return exports;
})();
