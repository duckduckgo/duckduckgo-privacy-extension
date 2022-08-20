const { calculateTotals } = require('../../models/mixins/calculate-aggregation-stats')
const trackingRequestsBlocked = 'Requests Blocked from Loading'
const noTrackingRequestsFound = 'No Tracking Requests Found'
const trackingRequestsFound = 'Tracking Requests Found'
const noTrackingRequestsBlocked = 'No Tracking Requests Blocked'
const thirdPartyRequestsLoaded = 'Third-Party Requests Loaded'
const noThirdPartyRequestsLoaded = 'No Third-Party Requests Loaded'
const majorTrackerNetworksFound = 'Major Tracker Networks Found'
const noMajorTrackerNetworksFound = 'No Major Tracker Networks Found'
const icons = {
    warning: 'warning',
    info: 'info',
    blocked: 'blocked'
}
const heroIcons = {
    ...icons,
    zero: 'zero'
}

function calculateHeadings (site) {
    const { specialRequestCount, thirdPartyRequestCount, trackersBlockedCount } = calculateTotals(site.aggregationStats)
    const protectionsEnabled = site.protectionsEnabled

    let trackingRequestHeader = ''
    let thirdPartyRequestHeader = ''

    let trackingRequestIcon = icons.blocked
    let thirdPartyRequestIcon = icons.blocked

    // State 1 Conditions:
    // - At least one request blocked
    // - At least one request loaded from any category (special or not)
    if (trackersBlockedCount >= 1 && thirdPartyRequestCount >= 1) {
        trackingRequestHeader = trackingRequestsBlocked
        thirdPartyRequestHeader = thirdPartyRequestsLoaded

        thirdPartyRequestIcon = icons.info
    }

    // State 2 Conditions:
    // - No requests blocked
    // - At least one request loaded in a special category (i.e., matching any blocklist rule/allowlist)
    if (trackersBlockedCount === 0 && specialRequestCount >= 1) {
        trackingRequestHeader = noTrackingRequestsBlocked
        thirdPartyRequestHeader = thirdPartyRequestsLoaded

        trackingRequestIcon = icons.info
        thirdPartyRequestIcon = icons.info
    }

    // State 3 Conditions:
    // - No request blocked
    // - No request loaded in a special category (i.e., matching any blocklist rule/allowlist)
    // - At least one request loaded in a non-special category (i.e., in "The following domains' requests were also loaded")
    if (trackersBlockedCount === 0 && specialRequestCount === 0 && thirdPartyRequestCount >= 1) {
        trackingRequestHeader = noTrackingRequestsFound
        thirdPartyRequestHeader = thirdPartyRequestsLoaded

        thirdPartyRequestIcon = icons.info
    }

    // State 4 Conditions:
    // - No request blocked
    // - No request loaded in a special category (i.e., matching any blocklist rule/allowlist)
    // - No request loaded in a non-special category (i.e., in "The following domains' requests were also loaded")
    if (trackersBlockedCount === 0 && thirdPartyRequestCount === 0) {
        trackingRequestHeader = noTrackingRequestsFound
        thirdPartyRequestHeader = noThirdPartyRequestsLoaded
    }

    // State 5 Conditions:
    // - At least one request blocked
    // - No request loaded in a special category (i.e., matching any blocklist rule/allowlist)
    // - No request loaded in a non-special category (i.e., in "The following domains' requests were also loaded")
    if (trackersBlockedCount >= 1 && thirdPartyRequestCount === 0) {
        trackingRequestHeader = trackingRequestsBlocked
        thirdPartyRequestHeader = noThirdPartyRequestsLoaded
    }

    // Swapping tracker to 'warning':
    // NOTE: This was added to prevent the icon changing when the toggle is clicked
    // - Protections off
    // - No trackers blocked (eg: because the page was freshly reloaded with protections off)
    // - At least one request loaded in a special category (i.e., matching any blocklist rule/allowlist)
    if (!protectionsEnabled && trackersBlockedCount === 0) {
        if (specialRequestCount > 0) {
            trackingRequestIcon = icons.warning
        }
    }

    return {
        trackingRequestHeader,
        thirdPartyRequestHeader,
        trackingRequestIcon,
        thirdPartyRequestIcon
    }
}

module.exports = {
    majorTrackerNetworksText (hasMajorTrackerNetworks) {
        if (hasMajorTrackerNetworks) {
            return majorTrackerNetworksFound
        }
        return noMajorTrackerNetworksFound
    },
    gradeTrackerNetworksText: function (site) {
        const { specialRequestCount, trackersBlockedCount } = calculateTotals(site.aggregationStats)
        const total = specialRequestCount + trackersBlockedCount
        if (total === 0) {
            return noTrackingRequestsFound
        }
        return trackingRequestsFound
    },
    trackerNetworksText: function (site) {
        return calculateHeadings(site).trackingRequestHeader
    },
    nonTrackerNetworksText: function (site) {
        return calculateHeadings(site).thirdPartyRequestHeader
    },
    trackerNetworksIcon: function (site) {
        return calculateHeadings(site).trackingRequestIcon
    },
    nonTrackerNetworksIcon: function (site) {
        return calculateHeadings(site).thirdPartyRequestIcon
    },
    trackerNetworksExplainer: function (site) {
        const noTrackersFound = 'We did not identify any tracking requests on this page.'
        const text = {
            'protections on': {
                'trackers found + trackers blocked': 'The following third-party domains’ requests were blocked from loading because they were identified as tracking requests. If a company\'s requests are loaded, it can allow them to profile you.',
                'trackers found + trackers not blocked': 'No tracking requests were blocked from loading on this page. If a company\'s requests are loaded, it can allow them to profile you.',
                'trackers not found + other thirdparties': noTrackersFound,
                'trackers not found + thirdparties not found': noTrackersFound
            },
            'protections off': {
                'trackers found + trackers not blocked': 'No tracking requests were blocked from loading because Protections are turned off for this site. If a company\'s requests are loaded, it can allow them to profile you.',
                'trackers not found + other thirdparties': noTrackersFound,
                'trackers not found + thirdparties not found': noTrackersFound
            }
        }
        const { otherRequestCount, specialRequestCount, trackersBlockedCount } = calculateTotals(site.aggregationStats)

        if (site.protectionsEnabled) {
            const sublist = text['protections on']
            if (trackersBlockedCount > 0) {
                return sublist['trackers found + trackers blocked']
            } else if (specialRequestCount > 0) {
                return sublist['trackers found + trackers not blocked']
            } else if (otherRequestCount > 0) {
                return sublist['trackers not found + other thirdparties']
            }
            return sublist['trackers not found + thirdparties not found']
        }

        const sublist = text['protections off']
        if (specialRequestCount > 0) {
            return sublist['trackers found + trackers not blocked']
        }

        return sublist['trackers not found + other thirdparties']
    },
    nonTrackerNetworksExplainer: function (site) {
        const noThirdPartiesDetected = 'We did not detect requests from any third-party domains.'
        const text = {
            'protections on': {
                'trackers found + trackers not blocked': 'The following third-party domains’ requests were loaded. If a company\'s requests are loaded, it can allow them to profile you, though our other web tracking protections still apply.',
                'trackers not found + thirdparties not found': noThirdPartiesDetected
            },
            'protections off': {
                'trackers found + trackers not blocked': 'No third-party requests were blocked from loading because Protections are turned off for this site. If a company\'s requests are loaded, it can allow them to profile you.',
                'trackers not found + thirdparties not found': noThirdPartiesDetected
            }
        }
        const { otherRequestCount, specialRequestCount } = calculateTotals(site.aggregationStats)
        if (site.protectionsEnabled) {
            const sublist = text['protections on']
            if (specialRequestCount > 0 || otherRequestCount > 0) {
                return sublist['trackers found + trackers not blocked']
            }
            return sublist['trackers not found + thirdparties not found']
        }
        const sublist = text['protections off']
        if (specialRequestCount > 0 || otherRequestCount > 0) {
            return sublist['trackers found + trackers not blocked']
        }
        return sublist['trackers not found + thirdparties not found']
    },
    heroIcon: function (site) {
        const { trackersBlockedCount, specialRequestCount } = calculateTotals(site.aggregationStats)

        if (site.protectionsEnabled) {
            if (trackersBlockedCount > 0) {
                return heroIcons.blocked
            }
            if (specialRequestCount > 0) {
                return heroIcons.info
            }
        }
        if (specialRequestCount > 0) {
            return heroIcons.warning
        }
        return heroIcons.zero
    }
}
