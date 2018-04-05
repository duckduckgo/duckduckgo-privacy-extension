module.exports = {
    "trackerListLoc": "data/tracker_lists",
    "blockLists": [
        "trackersWithParentCompany.json"
    ],
    "entityList": "https://duckduckgo.com/contentblocking.js?l=entitylist2",
    "entityMap": "data/tracker_lists/entityMap.json",
    "easylists": ["privacy", "general"],
    "blocking": ["Advertising", "Analytics"],
    "requestListenerTypes": ["main_frame","sub_frame","stylesheet","script","image","object","xmlhttprequest","other"],
    "trackersWhitelistTemporary": "https://duckduckgo.com/contentblocking/trackers-whitelist-temporary.txt",
    "trackersWhitelist": "https://duckduckgo.com/contentblocking/trackers-whitelist.txt",
    "generalEasylist": "https://duckduckgo.com/contentblocking.js?l=easylist",
    "privacyEasylist": "https://duckduckgo.com/contentblocking.js?l=easyprivacy",
    "surrogateList": "https://duckduckgo.com/contentblocking.js?l=surrogates",
    "httpsUpgradeList": "https://duckduckgo.com/contentblocking.js?l=https2",
    "tosdrMessages" : {
        "A": "Good",
        "B": "Mixed",
        "C": "Bad",
        "D": "Bad",
        "E": "Bad",
        "good": "Good",
        "bad": "Bad",
        "unknown": "Unknown",
        "mixed": "Mixed"
    },
    "httpsMessages": {
        "secure": "Encrypted Connection",
        "upgraded": "Forced Encryption",
        "none": "Unencrypted Connection",
    },
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
        "oath": 9,
        "maxcdn": 7,
        "automattic": 7
    }
}
