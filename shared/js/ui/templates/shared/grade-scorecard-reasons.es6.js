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
    // only show a message if there are any
    let totalTrackerNetworkCount = site.majorTrackerNetworksCount

    // add 1 if the site itself is a tracker network
    if (site.isaMajorTrackingNetwork) {
        totalTrackerNetworkCount += 1
    }

    const majorTrackersBadOrGood = (totalTrackerNetworkCount !== 0) ? 'bad' : 'good'
    reasons.push({
        modifier: majorTrackersBadOrGood,
        msg: `${majorTrackerNetworksText(totalTrackerNetworkCount)}`
    })

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
