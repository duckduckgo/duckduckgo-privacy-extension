const statusList = require('./status-list.es6.js')
const trackerNetworksText = require('./tracker-networks-text.es6.js')

module.exports = function (site) {
  const reasons = getReasons(site)

  if (!reasons || !reasons.length) return

  return statusList(reasons, 'status-list--right padded border--bottom--inner js-grade-scorecard-reasons')
}

function getReasons (site) {
  let reasons = []

  // grab all the data from the site to create
  // a list of reasons behind the grade

  // encryption status
  const httpsState = site.httpsState
  if (httpsState) {
    let modifier = httpsState === 'none' ? 'bad' : 'good'

    reasons.push({
      modifier,
      msg: site.httpsStatusText
    })
  }

  // tracking networks blocked or found,
  // only show a message if there's any
  if (site.totalTrackerNetworks !== 0) {
    reasons.push({
      modifier: 'bad',
      msg: `${trackerNetworksText(site)}`
    })
  }

  // major tracking networks,
  // only show a message if it's bad
  if (site.isPartOfMajorTrackingNetwork) {
    reasons.push({
      modifier: 'bad',
      msg: `Site Is Part of a Major Tracker Network`
    })
  }

  // privacy practices from tosdr
  const privacyMessage = site.tosdr && site.tosdr.message
  if (privacyMessage && privacyMessage !== window.constants.tosdrMessages.unknown) {
    reasons.push({
      modifier: privacyMessage.toLowerCase(),
      msg: `${privacyMessage} Privacy Practices`
    })
  }

  return reasons
}
