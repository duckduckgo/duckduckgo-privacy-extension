const defaultSettings = {
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
    "blockLists": [
        "trackersWithParentCompany"
    ],
    "entityList": "https://raw.githubusercontent.com/mozilla-services/shavar-prod-lists/master/disconnect-entitylist.json",
    "entityMap": "data/tracker_lists/entityMap.json",
    "easylists": ["privacy", "general"],
    "blocking": ["Advertising", "Analytics"],
    "requestListenerTypes": ["main_frame","sub_frame","stylesheet","script","image","object","xmlhttprequest","other"],
    "httpsWhitelist": "data/httpsWhitelist.json",
    "majorTrackingNetworks": {"Google":true, "Facebook":true, "Twitter":true, "Amazon":true, "AppNexus":true, "Oracle":true}
}
