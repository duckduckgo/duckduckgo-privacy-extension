module.exports = {
    "entityList": "https://duckduckgo.com/contentblocking.js?l=entitylist2",
    "entityMap": "data/tracker_lists/entityMap.json",
    "displayCategories": ["Analytics", "Advertising", "Social Network"],
    "requestListenerTypes": ["main_frame","sub_frame","stylesheet","script","image","object","xmlhttprequest","other"],
    "feedbackUrl": "https://duckduckgo.com/feedback.js?type=extension-feedback",
    "tosdrMessages" : {
        "A": "Good",
        "B": "Mixed",
        "C": "Poor",
        "D": "Poor",
        "E": "Poor",
        "good": "Good",
        "bad": "Poor",
        "unknown": "Unknown",
        "mixed": "Mixed"
    },
    "httpsService": "https://duckduckgo.com/smarter_encryption.js",
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
    /*
     * Mapping entity names to CSS class name for popup icons
     */
    "entityIconMapping": {
        "Google LLC": "google",
        "Facebook, Inc.": "facebook",
        "Twitter, Inc.": "twitter",
        "Amazon Technologies, Inc.": "amazon",
        "AppNexus, Inc.": "appnexus",
        "MediaMath, Inc.": "mediamath",
        "StackPath, LLC": "maxcdn",
        "Automattic, Inc.": "automattic",
        "Adobe Inc.": "adobe",
        "Quantcast Corporation": "quantcast",
        "The Nielsen Company": "nielsen"
    },
    "httpsDBName": "https",
    "httpsLists": [
        {
            "type": "upgrade bloom filter",
            "name": "httpsUpgradeBloomFilter",
            "url": "https://staticcdn.duckduckgo.com/https/https-bloom.json"
        },
        {
            "type": "don\'t upgrade bloom filter",
            "name": "httpsDontUpgradeBloomFilters",
            "url": "https://staticcdn.duckduckgo.com/https/negative-https-bloom.json"
        },
        {
            "type": "upgrade safelist",
            "name": "httpsUpgradeList",
            "url": "https://staticcdn.duckduckgo.com/https/negative-https-whitelist.json"
        },
        {
            "type": "don\'t upgrade safelist",
            "name": "httpsDontUpgradeList",
            "url": "https://staticcdn.duckduckgo.com/https/https-whitelist.json"
        },
    ],
    "tdsLists": [
        {
            "name": "surrogates",
            "url": "/data/surrogates.txt",
            "format": "text",
            "source": "local"
        },
        {
            "name": "tds",
            "url": "https://staticcdn.duckduckgo.com/trackerblocking/v2.1/tds.json",
            "format": "json",
            "source": "external"
        },
        {
            "name": "brokenSiteList",
            "url": "https://duckduckgo.com/contentblocking/trackers-unprotected-temporary.txt",
            "format": "text",
            "source": "external"
        },
        {
            "name": "fingerprinting",
            "url": "https://duckduckgo.com/contentblocking/fingerprinting.json",
            "format": "json",
            "source": "external"
        },
        {
            "name": "ReferrerExcludeList",
            "url": "https://staticcdn.duckduckgo.com/useragents/referrer_excludes.json",
            "format": "json",
            "source": "external"
        }
    ],
    "UserAgentLists": [
        {
            "name": "agents",
            "url": "https://staticcdn.duckduckgo.com/useragents/random_useragent.json",
            "format": "json",
            "source": "external"
        },
        {
            "name": "excludeList",
            "url": "https://staticcdn.duckduckgo.com/useragents/useragent_excludes.json",
            "format": "json",
            "source": "external"
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
