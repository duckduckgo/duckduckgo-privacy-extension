const defaultSettings = {
    "version": null,
    "atb": null,
    "extensionIsEnabled": true,
    "socialBlockingIsEnabled": false,
    "trackerBlockingEnabled": true,
    "httpsEverywhereEnabled": true,
    "embeddedTweetsEnabled": false,
    "meanings": true,
    "advanced_options": true,
    "last_search": "",
    "lastsearch_enabled": true,
    "safesearch": true,
    "use_post": false,
    "ducky": false,
    "dev": false,
    "zeroclick_google_right": false,
    "trackerListLoc": "data/tracker_lists",
    "tosdr": "data/tosdr.json",
    "blockLists": [ "trackersWithParentCompany.json"],
    "entityList": "https://duckduckgo.com/contentblocking.js?l=entitylist",
    "entityMap": "data/tracker_lists/entityMap.json",
    "easylists": ["privacy", "general"],
    "blocking": ["Advertising", "Analytics"],
    "requestListenerTypes": ["main_frame","sub_frame","stylesheet","script","image","object","xmlhttprequest","other"],
    "httpsWhitelist": "data/httpsWhitelist.json",
    "trackersWhitelistTemporary": "https://duckduckgo.com/contentblocking/trackers-whitelist-temporary.txt",
    "trackersWhitelistTemporary-etag": null,
    "trackersWhitelist": "https://duckduckgo.com/contentblocking.js?l=trackers-whitelist",
    "trackersWhitelist-etag": null,
    "generalEasylist": "https://duckduckgo.com/contentblocking.js?l=easylist",
    "generalEasylist-etag": null,
    "privacyEasylist": "https://duckduckgo.com/contentblocking.js?l=easyprivacy",
    "privacyEasylist-etag": null,
    "majorTrackingNetworks": {
        "Google": true,
        "Facebook": true,
        "Twitter": true,
        "Amazon": true,
        "AppNexus": true
    }
}

if (typeof window === 'undefined' && module && module.exports)  {
    module.exports = defaultSettings
}
