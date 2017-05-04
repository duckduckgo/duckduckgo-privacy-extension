require.scopes.utils = ( () => {

    function extractHostFromURL(url) {
        var a = parseUrl(url)
        var parts = a.hostname.split('.');
        var host = parts.slice(-2).join('.');
        return host;
    }

    function parseUrl(url){
        var a = document.createElement('a');
        a.href = url;
        return a;
    }

    function syncToStorage(data){
        chrome.storage.local.set(data, function() {
            console.log("updated local storage data");
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
    exports.parseUrl = parseUrl;
    return exports;
})();
