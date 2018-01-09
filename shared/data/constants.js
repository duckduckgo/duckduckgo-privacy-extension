let constants = {
    "trackerListLoc": "data/tracker_lists",
    "tosdr": "data/tosdr.json",
    "blockLists": [
        "trackersWithParentCompany.json"
    ],
    "entityList": "https://duckduckgo.com/contentblocking.js?l=entitylist",
    "entityMap": "data/tracker_lists/entityMap.json",
    "easylists": ["privacy", "general"],
    "blocking": ["Advertising", "Analytics"],
    "httpsUpgradeList": "data/httpsUpgradeList.json",
    "httpsUpgradeListUrl": "https://brian.duckduckgo.com/contentblocking.js?l=https2",
    "requestListenerTypes": ["main_frame","sub_frame","stylesheet","script","image","object","xmlhttprequest","other"],
    "trackersWhitelistTemporary": "https://duckduckgo.com/contentblocking/trackers-whitelist-temporary.txt",
    "trackersWhitelist": "https://duckduckgo.com/contentblocking/trackers-whitelist.txt",
    "generalEasylist": "https://duckduckgo.com/contentblocking.js?l=easylist",
    "privacyEasylist": "https://duckduckgo.com/contentblocking.js?l=easyprivacy",
    /**
     * Major tracking networks data:
     * percent of the top 1 million sites a tracking network has been seen on.
     * see: https://webtransparency.cs.princeton.edu/webcensus/
     */
    "majorTrackingNetworks": {
        "google": 84,
        "facebook": 36,
        "twitter": 16,
        "amazon": 14,
        "appnexus": 10,
        "oracle": 10,
        "mediamath": 9,
        "yahoo": 9,
        "maxcdn": 7,
        "automattic": 7
    }
}

if (typeof window === 'undefined' && module && module.exports)  {
    module.exports = constants
} else if (typeof window === 'object') {
    window.constants = constants
}
