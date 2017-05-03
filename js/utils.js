require.scopes.utils = ( () => {

    function extractHostFromURL(url) {
        var a = document.createElement('a');
        a.href = url;
        var parts = a.hostname.split('.');
        var host = parts.slice(-2).join('.');
        return host;
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

    var exports = {};
    exports.extractHostFromURL = extractHostFromURL;
    exports.syncToStorage = syncToStorage;
    exports.getFromStorage = getFromStorage;
    exports.getCurrentURL = getCurrentURL;
    return exports;
})();
