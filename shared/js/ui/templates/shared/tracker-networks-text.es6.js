const bel = require('bel')

module.exports = function (site) {
  const networkOrNetworks = (site.totalTrackersCount === 1) ? 'Network' : 'Networks'

  const text = site.totalTrackersCount + ' Tracker ' + networkOrNetworks + ' ' + trackersBlockedOrFound(site)
  return bel`${text}`
}

function trackersBlockedOrFound (site) {
  let msg = ''
  if (site &&
     (site.isWhitelisted || site.trackerNetworks.length === 0)) {
    msg = 'Found'
  } else {
    msg = 'Blocked'
  }
  return bel`${msg}`
}
