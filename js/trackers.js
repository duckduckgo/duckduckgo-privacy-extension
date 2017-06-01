
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

    if (settings.getSetting('trackerBlockingEnabled')) {
        
        var trackerURL = utils.parseURL(url).hostname.split('.');
        var isWhiteListed = false;
        var social_block = settings.getSetting('socialBlockingIsEnabled');
        var blockSettings = settings.getSetting('blocking').slice(0);

        if(social_block){
            blockSettings.push('Social');
        }

        var trackerByParentCompany = checkTrackersWithParentCompany(blockSettings, trackerURL, currLocation);
        if(trackerByParentCompany) {
            return trackerByParentCompany;
        }

    }
    return toBlock;
}

function checkTrackersWithParentCompany(blockSettings, url, currLocation) {
    var toBlock;
    
    // base case
    if (url.length < 2)
        return;

    let trackerURL = url.join('.');

    blockSettings.some( function(trackerType) {
        // Some trackers are listed under just the host name of their parent company without
        // any subdomain. Ex: ssl.google-analytics.com would be listed under just google-analytics.com.
        // Other trackers are listed using their subdomains. Ex: developers.google.com.
        // We'll start by checking the full host with subdomains and then if no match is found
        // try pulling off the subdomain and checking again.
        if(trackerLists.trackersWithParentCompany[trackerType]) {
            var tracker = trackerLists.trackersWithParentCompany[trackerType][trackerURL];
            if(tracker && !isRelatedEntity(tracker.c, currLocation)){
                Companies.add(tracker.c);
                return toBlock = {parentCompany: tracker.c, url: trackerURL, type: trackerType};
            }
        }
        
     });

    if (toBlock) {
        return toBlock;
    }
    else {
        // remove the subdomain and recheck for trackers. This is recursive, we'll continue
        // to pull off subdomains until we either find a match or have no url to check.
        // Ex: x.y.z.analytics.com would be checked 4 times pulling off a subdomain each time.
        url.shift();
        return checkTrackersWithParentCompany(blockSettings, url, currLocation);
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
