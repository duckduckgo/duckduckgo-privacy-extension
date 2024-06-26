// Expected pixel requests fired for each test case.
// TODO: Move this into the shared testCases.json file.
//       See https://github.com/duckduckgo/privacy-test-pages/blob/main/adClickFlow/shared/testCases.json
exports.expectedPixels = [
    // Ad 1 - No ad_domain parameter, so no pixels.
    { },

    // Ad 2 - No ad_domain parameter, so no pixels.
    { },

    // Ad 3 - No ad_domain parameter, so no pixels.
    { },

    // Ad 4 - No ad_domain parameter, so no pixels.
    { },

    // Ad 5
    {
        // Navigated to search page.
        1: [
        ],
        // Clicked ad with empty ad_domain parameter and two requests allowed.
        2: [
            {
                name: 'm_ad_click_detected',
                params: {
                    domainDetection: 'heuristic_only',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            },
            {
                name: 'm_ad_click_active',
                params: { }
            },
            // After 24 hours the aggregate pixel fires.
            {
                name: 'm_pageloads_with_ad_attribution',
                params: {
                    count: '1'
                }
            }
        ]
    },

    // Ad 6
    {
        // Navigated to search page.
        1: [
        ],
        // Clicked ad with empty ad_domain parameter and two requests allowed.
        2: [
            {
                name: 'm_ad_click_detected',
                params: {
                    domainDetection: 'heuristic_only',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            },
            {
                name: 'm_ad_click_active',
                params: { }
            },
            // After 24 hours the aggregate pixel fires.
            {
                name: 'm_pageloads_with_ad_attribution',
                params: {
                    count: '1'
                }
            }
        ]
    },

    // Ad 7
    {
        // Navigated to search page.
        1: [
        ],
        // Click ad with populated ad_domain parameter that matches. Two
        // requests allowed.
        2: [
            {
                name: 'm_ad_click_detected',
                params: {
                    domainDetection: 'matched',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            },
            {
                name: 'm_ad_click_active',
                params: { }
            },
            // After 24 hours the aggregate pixel fires.
            {
                name: 'm_pageloads_with_ad_attribution',
                params: {
                    count: '1'
                }
            }
        ]
    },

    // Ad 8
    {
        // Navigated to search page.
        1: [
        ],
        // Click ad with populated ad_domain parameter that matches. Two
        // requests allowed.
        2: [
            {
                name: 'm_ad_click_detected',
                params: {
                    domainDetection: 'matched',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            },
            {
                name: 'm_ad_click_active',
                params: { }
            },
            // After 24 hours the aggregate pixel fires.
            {
                name: 'm_pageloads_with_ad_attribution',
                params: {
                    count: '1'
                }
            }
        ]
    },

    // Ad 5 - "Single-site, new-tab, session"
    {
        // Navigated to search page.
        1: [
        ],
        // Clicked ad with empty ad_domain parameter and two requests allowed.
        2: [
            {
                name: 'm_ad_click_detected',
                params: {
                    domainDetection: 'heuristic_only',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            },
            {
                name: 'm_ad_click_active',
                params: { }
            }
        ],
        // Navigated to another page, two more requests allowed.
        3: [
            // After 24 hours the aggregate pixel fires.
            {
                name: 'm_pageloads_with_ad_attribution',
                params: {
                    count: '2'
                }
            }
        ]
    },

    // Ad 5 - "Single-site, new-tab, session, variant two"
    {
        // Navigated to search page.
        1: [
        ],
        // Clicked ad with empty ad_domain parameter and two requests allowed.
        2: [
            {
                name: 'm_ad_click_detected',
                params: {
                    domainDetection: 'heuristic_only',
                    heuristicDetectionEnabled: '1',
                    domainDetectionEnabled: '1'
                }
            },
            {
                name: 'm_ad_click_active',
                params: { }
            }
        ],
        // Navigated to another page, two more requests allowed.
        3: [
            // After 24 hours the aggregate pixel fires.
            {
                name: 'm_pageloads_with_ad_attribution',
                params: {
                    count: '2'
                }
            }
        ]
    }
]
