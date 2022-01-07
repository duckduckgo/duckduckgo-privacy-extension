const bel = require('bel')

module.exports = function (site, isMajorNetworksCount) {
    // Show all trackers found if site is allowlisted
    // but only show the blocked ones otherwise
    let trackersCount = site.isAllowlisted ? site.trackersCount : site.trackersBlockedCount || 0
    let uniqueTrackersText = trackersCount === 1 ? ' Tracker ' : ' Trackers '

    if (isMajorNetworksCount) {
        trackersCount = site.majorTrackerNetworksCount
        uniqueTrackersText = trackersCount === 1 ? ' Major Tracker Network ' : ' Major Tracker Networks '
    }
    const finalText = trackersCount + uniqueTrackersText + trackersBlockedOrFound(site, trackersCount)

    return bel`${finalText}`
}

function trackersBlockedOrFound (site, trackersCount) {
    let msg = ''
    if (site && site.isAllowlisted) {
        msg = 'Found'
    } else {
        msg = 'Blocked'
    }

    return bel`${msg}`
}
