module.exports = {
    "trackerListLoc": "data/tracker_lists",
    "blockLists": [
        "trackersWithParentCompany.json"
    ],
    "entityList": "https://duckduckgo.com/contentblocking.js?l=entitylist2",
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
    "httpsDBName": "https",
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
    "httpsErrorCodes": {
        "net::ERR_CONNECTION_REFUSED": 1,
        "net::ERR_ABORTED": 2,
        "net::ERR_SSL_PROTOCOL_ERROR": 3,
        "net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH": 4,
        "net::ERR_NAME_NOT_RESOLVED": 5,
        "NS_ERROR_CONNECTION_REFUSED": 6,
        "NS_ERROR_UNKNOWN_HOST": 7,
        "An additional policy constraint failed when validating this certificate.": 8,
        "Unable to communicate securely with peer: requested domain name does not match the server’s certificate.": 9,
        "Cannot communicate securely with peer: no common encryption algorithm(s).": 10,
        "SSL received a record that exceeded the maximum permissible length.": 11,
        "The certificate is not trusted because it is self-signed.": 12,
        "downgrade_redirect_loop": 13
    }
}
