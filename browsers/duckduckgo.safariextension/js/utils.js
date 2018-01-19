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
        const rgx = uaString.match(/(Safari|Firefox|Chrome)\/([0-9]+)/)
        return {
            browser: rgx[1],
            majorVersion: rgx[2]
        }
    }

    function syncToStorage (data){
        if(data) {
            let key = Object.keys(data)[0]
            localStorage[key] = JSON.stringify(data[key])
        }
    }

    function getFromStorage (key, callback) {
        let setting = localStorage[key]
        console.log(`Data from storage: ${localStorage[key]}`)
        // try to parse json
        try {
            callback(JSON.parse(setting))
        } catch (e) {
            callback(setting)
        }
    }

    function getCurrentURL(callback){
        callback(safari.application.activeBrowserWindow.activeTab.url)
    }

    function getCurrentTab(callback){
        callback(safari.application.activeBrowserWindow.activeTab)
    }

    function setBadgeIcon (iconPath, target) {
        if (target.activeTab) target = target.activeTab

        let windowId = _getSafariWindowId(target)
        if (iconPath && windowId !== undefined) {
            safari.extension.toolbarItems[windowId].image = safari.extension.baseURI + iconPath
            safari.extension.popovers[0].contentWindow.location.reload()
        }
    }

    function _getSafariWindowId (target) {
        for(let i = 0; i < safari.extension.toolbarItems.length; i++) {
            if (safari.extension.toolbarItems[i].browserWindow.activeTab === target) {
                return i
            }
        }
    }

    function getSafariTabIndex (target) {
        for (let i = 0; i < safari.application.activeBrowserWindow.tabs.length; i++) {
            if (target === safari.application.activeBrowserWindow.tabs[i]) {
                return i
            }
        }
    }

    return {
        extractHostFromURL: extractHostFromURL,
        extractTopSubdomainFromHost: extractTopSubdomainFromHost,
        parseUserAgentString: parseUserAgentString,
        syncToStorage: syncToStorage,
        getFromStorage: getFromStorage,
        getCurrentURL: getCurrentURL,
        getCurrentTab: getCurrentTab,
        getProtocol: getProtocol,
        setBadgeIcon: setBadgeIcon,
        getSafariTabIndex: getSafariTabIndex
    }
})();
