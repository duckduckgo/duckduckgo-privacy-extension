
var betterList = JSON.parse(load.loadExtensionFile('better-pages.txt', 'json'));

require.scopes.trackers = (function() {    

var load = require('load'),
    settings = require('settings'),
    utils = require('utils'),
    trackerLists = require('trackerLists').getLists(),
    blockLists = settings.getSetting('blockLists'),
    entityList = JSON.parse(load.loadExtensionFile(settings.getSetting('entityList'), 'json', 'external'));


var blockList = {};
    
function blockTrackers(url, currLocation, tabId) {

    var toBlock = false;

    if (settings.getSetting('extensionIsEnabled')) {
        
        var host = utils.extractHostFromURL(url);
        var isWhiteListed = false;
        var social_block = settings.getSetting('socialBlockingIsEnabled');

        if(isWhitelisted(host, tabId)) {
            return;
        }

        var trackerByParentCompany = checkTrackersWithParentCompany(host, currLocation);
        if(trackerByParentCompany) {
            return trackerByParentCompany;
        }

    }
    else {
        chrome.browserAction.setBadgeText({tabId: parseInt(tabId) + 0, text: ""});
    }

    return toBlock;
}

function checkTrackersWithParentCompany(host, currLocation) {
    var toBlock;
    settings.getSetting('blocking').some( function(trackerType) {
        var tracker = trackerLists.trackersWithParentCompany[trackerType][host];
        if(tracker && !isRelatedEntity(tracker.c, currLocation)){
            return toBlock = {'tracker': tracker.c, 'url': host};
        }
     });
    return toBlock;
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
return exports;
})();
