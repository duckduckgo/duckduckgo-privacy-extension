const bel = require('bel')

module.exports = function (site, isMajorNetworksCount, includeUniqueTrackersCount) {
  const trackerNetworksCount = isMajorNetworksCount ? site.majorTrackersCount : site.totalTrackersCount

  let trackersText = isMajorNetworksCount ? ' Major Tracker' : ' Tracker'
  trackersText += (trackerNetworksCount === 1) ? ' Network ' : ' Networks '
  let finalText = trackerNetworksCount + trackersText + trackersBlockedOrFound(site, trackerNetworksCount)

  if (includeUniqueTrackersCount && trackerNetworksCount > 0) {
    const uniqueTrackersText = site.totalTrackersCount === 1 ? ' Unique Tracker In ' : ' Unique Trackers In '
    finalText = site.totalTrackersCount + uniqueTrackersText + finalText
    return bel`${finalText}`
  }
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
