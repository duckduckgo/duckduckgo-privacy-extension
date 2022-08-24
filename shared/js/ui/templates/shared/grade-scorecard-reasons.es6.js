const statusList = require('./status-list.es6.js')
const constants = require('../../../../data/constants')
const { majorTrackerNetworksText, gradeTrackerNetworksText } = require('./tracker-networks-text.es6.js')
const { calculateTotals } = require('../../models/mixins/calculate-aggregation-stats')

module.exports = function (site) {
    const reasons = getReasons(site)

    if (!reasons || !reasons.length) return

    return statusList(reasons, 'status-list--right padded border--bottom--inner js-grade-scorecard-reasons')
}

function getReasons (site) {
    const reasons = []

    // grab all the data from the site to create
    // a list of reasons behind the grade

    // encryption status
    const httpsState = site.httpsState
    if (httpsState) {
        const modifier = httpsState === 'none' ? 'bad' : 'good'

        reasons.push({
            modifier,
            msg: site.httpsStatusText
        })
    }

    // tracking requests found or not
    const { specialRequestCount, trackersBlockedCount } = calculateTotals(site.aggregationStats)
    const total = specialRequestCount + trackersBlockedCount
    const trackersBadOrGood = (total !== 0) ? 'bad' : 'good'
    reasons.push({
        modifier: trackersBadOrGood,
        msg: `${gradeTrackerNetworksText(site)}`
    })

    // major tracking networks,
    // Show banner if the site itself is a tracker network
    if (site.isaMajorTrackingNetwork) {
        reasons.push({
            modifier: 'bad',
            msg: 'Site Is a Major Tracker Network'
        })
    } else {
        const majorTrackersBadOrGood = site.hasMajorTrackerNetworks ? 'bad' : 'good'
        reasons.push({
            modifier: majorTrackersBadOrGood,
            msg: `${majorTrackerNetworksText(site.hasMajorTrackerNetworks)}`
        })
    }

    // privacy practices from tosdr
    const unknownPractices = constants.tosdrMessages.unknown
    const privacyMessage = (site.tosdr && site.tosdr.message) || unknownPractices
    const modifier = (privacyMessage === unknownPractices) ? 'poor' : privacyMessage.toLowerCase()
    reasons.push({
        modifier,
        msg: `${privacyMessage} Privacy Practices`
    })

    return reasons
}
