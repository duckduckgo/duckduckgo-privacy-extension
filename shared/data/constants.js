module.exports = {
    "entityMap": "data/tracker_lists/entityMap.json",
    "blocking": ["Advertising", "Analytics", "Social"],
    "requestListenerTypes": ["main_frame","sub_frame","stylesheet","script","image","object","xmlhttprequest","other"],
    "trackersWhitelistTemporary": "https://duckduckgo.com/contentblocking/trackers-whitelist-temporary.txt",
    "trackersWhitelist": "https://duckduckgo.com/contentblocking/trackers-whitelist.txt",
    "surrogateList": "https://duckduckgo.com/contentblocking.js?l=surrogates",
    "feedbackUrl": "https://duckduckgo.com/feedback.js?type=extension-feedback",
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
    },
    "httpsLists": [
        {
            "type": "upgrade list",
            "name": "httpsUpgradeList",
            "url": "https://staticcdn.duckduckgo.com/https/https-bloom.json"
        },
        {
            "type": "whitelist",
            "name": "httpsWhitelist",
            "url": "https://staticcdn.duckduckgo.com/https/https-whitelist.json"
        }
    ],
    "trackersLists": [
        {
            "type": "tracker list",
            "name": "trackersWithParentCompany",
            "url": "https://jason.duckduckgo.com/contentblocking.js?l=trackers"
        },
        {
            "type": "entity list",
            "name": "entityList",
            "url": "https://duckduckgo.com/contentblocking.js?l=entitylist2"
        }
    ]
}
