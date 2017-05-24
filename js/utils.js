require.scopes.utils = ( () => {

    function extractHostFromURL(url) {
        var a = parseURL(url)
        var parts = a.hostname.split('.');
        // remove subdomains from url
        var host = parts.slice(-2).join('.');
        return host;
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
        chrome.tabs.query({"active": true, "lastFocusedWindow": true}, function(tabData) {
            if(tabData.length){
                callback(tabData[0])
            }
        });
    }

    var exports = {};
    exports.extractHostFromURL = extractHostFromURL;
    exports.syncToStorage = syncToStorage;
    exports.getFromStorage = getFromStorage;
    exports.getCurrentURL = getCurrentURL;
    exports.getCurrentTab = getCurrentTab;
    exports.parseURL = parseURL;
    return exports;
})();
