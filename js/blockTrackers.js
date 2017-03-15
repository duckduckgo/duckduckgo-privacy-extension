
var load = require('load');
var blockListSource = "https://raw.githubusercontent.com/mozilla-services/shavar-prod-lists/master/disconnect-blacklist.json";
var entityListSource = "https://raw.githubusercontent.com/mozilla-services/shavar-prod-lists/master/disconnect-entitylist.json";

var blockList = JSON.parse(load.loadExtensionFile(blockListSource, 'json', 'external'));
var trackers = load.processMozillaBlockList(blockList);

var entityList = JSON.parse(load.loadExtensionFile(entityListSource, 'json', 'external'));

var betterList = JSON.parse(load.loadExtensionFile('better-pages.txt', 'json'));

require.scopes.blockTrackers = (function() {    
    
    // If blocking option is enabled
    // and url matches a tracker pattern
    // block the request
    function blockTrackers(url, currLocation) {
        if (localStorage['blocking'] === 'true') {
            var host = extractHostFromURL(url);

            if (trackers[host]) {
                localStorage['debug_blocking'] = (localStorage['blocking'] === 'true')? 'true' : 'false'; 
                //localStorage[tab.url] = localStorage[tab.url]? parseInt(localStorage[tab.url]) + 1 : 1;
                //chrome.browserAction.setBadgeText({tabId: tab.id, text: localStorage[tab.url] + ""});

                if( !isRelatedEntity(trackers[host], currLocation) ){
                    console.log("Blocking: " + host); 
                    return { 'tracker': trackers[host].c, 'url': host};
                }
                
                console.log("Skipping: " + host); 
             }
        }
        else if (localStorage['blocking'] === 'false') {
            chrome.browserAction.setBadgeText({tabId: parseInt(tabId) + 0, text: ""});
        }
    }

    /* Check to see if this tracker is related
     * to the the page we're on
     * Only block request to 3rd parties
     */
    function isRelatedEntity(tracker, currLocation) {
        var parentEntity = entityList[tracker.c];
        var host = extractHostFromURL(currLocation);

        if(parentEntity && parentEntity.properties && parentEntity.properties.indexOf(host) !== -1){
            return true;
        }
        return false;
    }

    function extractHostFromURL(url) {
        var a = document.createElement('a');
        a.href = url;
        var parts = a.hostname.split('.');
        var host = parts.slice(-2).join('.');;
        return host;
    }

    var exports = {};
    exports.blockTrackers = blockTrackers;
    exports.trackers = trackers;

    return exports;
})();
