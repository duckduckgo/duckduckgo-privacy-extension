// node module defined in tldjs.js
let tldjs

require.scopes.utils = ( () => {

    function extractHostFromURL (url) {
        if (!url) return;

        let urlObj = tldjs.parse(url);
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
        //chrome.storage.local.set(data, function() { });
    }

    function getFromStorage (key, callback){
        //chrome.storage.local.get(key, function(result){
        //    if(result[key]){
        //        callback(result[key]);
        //    }
        //});
    }

    function getCurrentURL(callback){
        callback(safari.application.activeBrowserWindow.activeTab.url)
    }

    function getCurrentTab(callback){
        callback(safari.application.activeBrowserWindow.activeTab)
    }

    return {
        extractHostFromURL: extractHostFromURL,
        extractSubdomainFromHost: extractSubdomainFromHost,
        parseUserAgentString: parseUserAgentString,
        syncToStorage: syncToStorage,
        getFromStorage: getFromStorage,
        getCurrentURL: getCurrentURL,
        getCurrentTab: getCurrentTab,
        getProtocol: getProtocol
    }
})();
