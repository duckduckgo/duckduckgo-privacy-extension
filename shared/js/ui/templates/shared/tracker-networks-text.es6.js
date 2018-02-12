const bel = require('bel')

module.exports = function (site, isMajorNetworksCount) {
  const trackerNetworksCount = isMajorNetworksCount ? site.majorTrackerNetworksCount : site.totalTrackerNetworksCount

  let trackersText = isMajorNetworksCount ? ' Major' : ''
  trackersText += (trackerNetworksCount === 1) ? ' Network ' : ' Networks '
  let finalText = trackerNetworksCount + trackersText + trackersBlockedOrFound(site, trackerNetworksCount)

  const uniqueTrackersText = site.trackersCount === 1 ? ' Tracker In ' : ' Trackers In '
  finalText = site.trackersCount + uniqueTrackersText + finalText

  return bel`${finalText}`
}

function trackersBlockedOrFound (site, trackerNetworksCount) {
  let msg = ''
  if (site && (site.isWhitelisted || trackerNetworksCount === 0)) {
    msg = 'Found'
  } else {
    msg = 'Blocked'
  }

  return bel`${msg}`
}
