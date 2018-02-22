const bel = require('bel')

module.exports = function (site, isMajorNetworksCount) {
  let trackersCount = site.trackersCount
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
  if (site && (site.isWhitelisted || trackersCount === 0)) {
    msg = 'Found'
  } else {
    msg = 'Blocked'
  }

  return bel`${msg}`
}
