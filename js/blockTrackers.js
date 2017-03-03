
var load = require('load');
var trackers = load.loadExtensionFile('js/trackers.json', 'json')

require.scopes.blockTrackers = (function() {    
    
    // If blocking option is enabled
    // and url matches a tracker pattern
    // block the request
    function blockTrackers(tab, url) {
        if (localStorage['blocking'] === 'true') {
            for (var i = 0; i < trackers.length; i++) {
                if (url.indexOf(trackers[i]) !== -1) {
                    localStorage['debug_blocking'] = (localStorage['blocking'] === 'true')? 'true' : 'false'; 
                    localStorage[tab.url] = localStorage[tab.url]? parseInt(localStorage[tab.url]) + 1 : 1;
                    chrome.browserAction.setBadgeText({tabId: tab.id, text: localStorage[tab.url] + ""});
                    
                    return {cancel: true};
                }
            }
        }
        else if (localStorage['blocking'] === 'false') {
            chrome.browserAction.setBadgeText({tabId: parseInt(tabId) + 0, text: ""});
        }
    }
    
    var exports = {};
    exports.blockTrackers = blockTrackers;
    exports.getJSON = getJSON;

    return exports;
})();
