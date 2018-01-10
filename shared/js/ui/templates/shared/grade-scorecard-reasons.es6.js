const statusList = require('./status-list.es6.js')

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
  const httpsStatusText = site.httpsStatusText
  if (httpsStatusText) {
    let connectionMsg = 'Unencrypted'
    let modifier = 'bad'

    if (httpsStatusText === 'Secure') {
      connectionMsg = 'Encrypted'
      modifier = 'good'
    }

    reasons.push({
      modifier,
      msg: `${connectionMsg} Connection`
    })
  }

  // tracking networks blocked,
  // only show a message if there's any blocked
  const numTrackerNetworks = site.trackerNetworks.length
  if (numTrackerNetworks) {
    reasons.push({
      modifier: 'bad',
      msg: `${numTrackerNetworks} Tracker Networks Blocked`
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
