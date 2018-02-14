const bel = require('bel')

module.exports = function (site, isMajorNetworksCount) {
  const uniqueTrackersText = site.trackersCount === 1 ? ' Tracker ' : ' Trackers '
  const finalText = site.trackersCount + uniqueTrackersText + trackersBlockedOrFound(site)

  return bel`${finalText}`
}

function trackersBlockedOrFound (site) {
  let msg = ''
  if (site && (site.isWhitelisted || site.trackersCount === 0)) {
    msg = 'Found'
  } else {
    msg = 'Blocked'
  }

  return bel`${msg}`
}
