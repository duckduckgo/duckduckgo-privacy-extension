const statusList = require('./status-list.es6.js')
const constants = require('../../../../data/constants')
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
    const trackersCount = site.isWhitelisted ? site.trackersCount : site.trackersBlockedCount
    const trackersBadOrGood = (trackersCount !== 0) ? 'bad' : 'good'
    reasons.push({
        modifier: trackersBadOrGood,
        msg: `${trackerNetworksText(site)}`
    })

    // major tracking networks,
    // only show a message if there are any
    const majorTrackersBadOrGood = (site.majorTrackerNetworksCount !== 0) ? 'bad' : 'good'
    reasons.push({
        modifier: majorTrackersBadOrGood,
        msg: `${trackerNetworksText(site, true)}`
    })

    // Is the site itself a major tracking network?
    // only show a message if it is
    if (site.isaMajorTrackingNetwork) {
        reasons.push({
            modifier: 'bad',
            msg: `Site is a Major Tracker Network`
        })
    }

    // privacy practices from tosdr
    const unknownPractices = constants.tosdrMessages.unknown
    const privacyMessage = (site.tosdr && site.tosdr.message) || unknownPractices
    const modifier = (privacyMessage === unknownPractices) ? 'poor' : privacyMessage.toLowerCase()
    reasons.push({
        modifier: modifier,
        msg: `${privacyMessage} Privacy Practices`
    })

    return reasons
}
