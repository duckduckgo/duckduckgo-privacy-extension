
var betterList = JSON.parse(load.loadExtensionFile('better-pages.txt', 'json'));

// these are defined in abp.js
var abp,
    easylists;

require.scopes.trackers = (function() {    

var load = require('load'),
    settings = require('settings'),
    utils = require('utils'),
    trackerLists = require('trackerLists').getLists(),
    entityList = load.JSONfromLocalFile(settings.getSetting('entityList')),
    entityMap =  load.JSONfromLocalFile(settings.getSetting('entityMap'));

function isTracker(urlToCheck, currLocation, tabId, request) {

    // TODO: easylist is marking some of our requests as trackers. Whitelist us
    // by default for now until we can figure out why. 
    if (currLocation.match(/duckduckgo\.com/)) {
        return false;
    }

    var toBlock = false;

    // DEMO embedded tweet option
    // a more robust test for tweet code may need to be used besides just
    // blocking platform.twitter.com
    if (settings.getSetting('embeddedTweetsEnabled') === false) {
        if (/platform.twitter.com/.test(urlToCheck)) {
            console.log("blocking tweet embedded code on " + urlToCheck);
            return {parentCompany: "twitter", url: "platform.twitter.com", type: "Analytics"};
        }
    }


    if (settings.getSetting('trackerBlockingEnabled')) {
        
        let urlSplit = utils.parseURL(urlToCheck).hostname.split('.');
        var isWhiteListed = false;
        var social_block = settings.getSetting('socialBlockingIsEnabled');
        var blockSettings = settings.getSetting('blocking').slice(0);

        if(social_block){
            blockSettings.push('Social');
        }

        // block trackers by parent company
        var trackerByParentCompany = checkTrackersWithParentCompany(blockSettings, urlSplit, currLocation);
        if(trackerByParentCompany) {
            return trackerByParentCompany;
        }

        // block trackers from easylists
        let easylistBlock = checkEasylists(urlToCheck, currLocation, request);
        if (easylistBlock) {
            return easylistBlock;
        }

    }
    return toBlock;
}

function checkEasylists(url, currLocation, request){
    let easylistBlock = false;
    settings.getSetting('easylists').some((listName) => {
        // lists can take a second or two to load so check that the parsed data exists
        if (easylists.loaded) {
            easylistBlock = abp.matches(easylists[listName].parsed, url, {
                domain: currLocation, 
                elementTypeMaskMap: abp.elementTypes[request.type.toUpperCase()]
            });
        }

        // break loop early if a list matches
        if(easylistBlock){
            let host = utils.extractHostFromURL(url);
            let parentCompany = findParent(host.split('.')) || "unknown";
            return easylistBlock = {parentCompany: parentCompany, url: host, type: listName};
        }

        // pull off subdomains and look for parent companies
        function findParent(url) {
            
            if (url.length < 2) return null;

            let joinURL = url.join('.')

            if (entityMap[joinURL]) {
                return entityMap[joinURL]
            }
            else{
                url.shift()
                return findParent(url)
            }
        }
    });
    return easylistBlock;
}

function checkTrackersWithParentCompany(blockSettings, url, currLocation) {
    var toBlock;
    
    // base case
    if (url.length < 2)
        return false;

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
