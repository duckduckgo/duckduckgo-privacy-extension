
var betterList = JSON.parse(load.loadExtensionFile('better-pages.txt', 'json'));

require.scopes.trackers = (function() {    

var load = require('load'),
    settings = require('settings'),
    utils = require('utils'),
    trackerLists = require('trackerLists').getLists(),
    blockLists = settings.getSetting('blockLists'),
    entityList = load.JSONfromLocalFile(settings.getSetting('entityList'));
    
function isTracker(url, currLocation, tabId) {

    var toBlock = false;

    if (settings.getSetting('extensionIsEnabled')) {
        
        var host = utils.extractHostFromURL(url);
        var isWhiteListed = false;
        var social_block = settings.getSetting('socialBlockingIsEnabled');
        var blockSettings = settings.getSetting('blocking').slice(0);

        if(isWhitelisted(host, tabId)) {
            return;
        }

        if(social_block){
            blockSettings.push('Social');
        }

        var trackerByParentCompany = checkTrackersWithParentCompany(blockSettings, host, currLocation);
        if(trackerByParentCompany) {
            return trackerByParentCompany;
        }

    }
    return toBlock;
}

function checkTrackersWithParentCompany(blockSettings, host, currLocation) {
    var toBlock;
    blockSettings.some( function(trackerType) {
        if(trackerLists.trackersWithParentCompany[trackerType]) {
            var tracker = trackerLists.trackersWithParentCompany[trackerType][host];
            if(tracker && !isRelatedEntity(tracker.c, currLocation)){
                return toBlock = {'tracker': tracker.c, 'url': host, 'type': trackerType};
            }
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
exports.isTracker = isTracker;
return exports;
})();
