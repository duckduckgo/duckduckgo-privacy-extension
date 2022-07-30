const trackingRequestsBlocked = 'Requests Blocked from Loading'
const noTrackingRequestsFound = 'No Tracking Requests Found'
const noTrackingRequestsBlocked = 'No Tracking Requests Blocked'
const thirdPartyRequestsLoaded = 'Third-Party Requests Loaded'
const noThirdPartyRequestsLoaded = 'No Third-Party Requests Loaded'

function calculateHeadings (site) {
    const trackersBlockedCount = site.aggregationStats.blocked.entitiesCount || 0
    const thirdPartyRequestCount = site.aggregationStats.allowed.entitiesCount || 0

    const ignoredCount = site.aggregationStats.ignored.entitiesCount || 0
    const firstPartyCount = site.aggregationStats.firstParty.entitiesCount || 0
    const adAttributionCount = site.aggregationStats.adAttribution.entitiesCount || 0
    const specialRequestCount = ignoredCount + firstPartyCount + adAttributionCount

    let trackingRequestHeader = ''
    let thirdPartyRequestHeader = ''

    // State 1 Conditions:
    // - At least one request blocked
    // - At least one request loaded from any category (special or not)
    if (trackersBlockedCount >= 1 && thirdPartyRequestCount >= 1) {
        trackingRequestHeader = trackingRequestsBlocked
        thirdPartyRequestHeader = thirdPartyRequestsLoaded
    }

    // State 2 Conditions:
    // - No requests blocked
    // - At least one request loaded in a special category (i.e., matching any blocklist rule/allowlist)
    if (trackersBlockedCount === 0 && specialRequestCount >= 1) {
        trackingRequestHeader = noTrackingRequestsBlocked
        thirdPartyRequestHeader = thirdPartyRequestsLoaded
    }

    // State 3 Conditions:
    // - No request blocked
    // - No request loaded in a special category (i.e., matching any blocklist rule/allowlist)
    // - At least one request loaded in a non-special category (i.e., in "The following domains' requests were also loaded")
    if (trackersBlockedCount === 0 && specialRequestCount === 0 && thirdPartyRequestCount >= 1) {
        trackingRequestHeader = noTrackingRequestsFound
        thirdPartyRequestHeader = thirdPartyRequestsLoaded
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

    return {
        trackingRequestHeader,
        thirdPartyRequestHeader
    }
}

module.exports = {
    majorTrackerNetworksText (count) {
        let network = 'Networks'
        if (count === 1) {
            network = 'Network'
        }
        return `${count} Major Tracker ${network} Found`
    },
    trackerNetworksText: function (site, isMajorNetworksCount) {
        return calculateHeadings(site).trackingRequestHeader
    },
    nonTrackerNetworksText: function (site) {
        return calculateHeadings(site).thirdPartyRequestHeader
    }
}
