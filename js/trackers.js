require.scopes.trackers = (function() {    

var load = require('load'),
    settings = require('settings'),
    utils = require('utils'),
    blockLists = settings.getSetting('blockLists'),
    entityList = JSON.parse(load.loadExtensionFile(settings.getSetting('entityList'), 'json', 'external')),
    betterList = JSON.parse(load.loadExtensionFile('better-pages.txt', 'json'));

var trackersWithParentCompany = {};

var blockList = {};
var trackers = [];
    
function blockTrackers(url, currLocation, tabId) {
    
    if (settings.getSetting('extensionIsEnabled')) {
        
        var host = utils.extractHostFromURL(url);
        var isWhiteListed = false;
        var social_block = settings.getSetting('socialBlockingIsEnabled');

        if(isWhitelisted(host, tabId)) {
            return;
        }

        settings.getSetting('blocking').forEach( function(trackerType) {
            var tracker = trackersWithParentCompany[trackerType][host];
            if(tracker && !isRelatedEntity(tracker.c, currLocation)){
                return { 'tracker': tracker.c, 'url': host};
            }
         });
    }
    else {
        chrome.browserAction.setBadgeText({tabId: parseInt(tabId) + 0, text: ""});
    }
}

function isWhitelisted(host, tabId){
    if ((tabs[tabId] && tabs[tabId].whitelist) && (tabs[tabId].whitelist.indexOf(host) !== -1)) {
        return true;
    }
}

/* Check to see if this tracker is related
 * to the the page we're on
 * Only block request to 3rd parties
 */
function isRelatedEntity(parentCompany, currLocation) {
    var parentEntity = entityList[parentCompany];
    var host = utils.extractHostFromURL(currLocation);

    if(parentEntity && parentEntity.properties && parentEntity.properties.indexOf(host) !== -1){
        return true;
    }
    return false;
}

var exports = {};
exports.blockTrackers = blockTrackers;
exports.trackers = trackers;
exports.blockList = blockList;
exports.trackersWithParentCompany = trackersWithParentCompany;

return exports;
})();
