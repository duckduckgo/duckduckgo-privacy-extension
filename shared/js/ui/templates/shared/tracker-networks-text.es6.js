const bel = require('bel')

module.exports = function (site, isMajorNetworksCount) {
  const trackerNetworksCount = isMajorNetworksCount ? site.majorTrackersCount : site.totalTrackersCount

  let trackersText = isMajorNetworksCount ? ' Major Tracker' : ' Tracker'
  trackersText += (trackerNetworksCount === 1) ? ' Network ' : ' Networks '

  const finalText = trackerNetworksCount + trackersText + trackersBlockedOrFound(site, trackerNetworksCount)
  return bel`${finalText}`
}

function trackersBlockedOrFound (site, trackerNetworksCount) {
  let msg = ''
  if (site &&
     (site.isWhitelisted || trackerNetworksCount === 0)) {
    msg = 'Found'
  } else {
    msg = 'Blocked'
  }
  return bel`${msg}`
}
