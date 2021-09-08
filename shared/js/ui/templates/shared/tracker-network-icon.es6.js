const bel = require('bel')

module.exports = function (siteRating, isAllowlisted, totalTrackerNetworksCount) {
    let iconNameModifier = 'blocked'

    if (isAllowlisted && (siteRating.before === 'D') && (totalTrackerNetworksCount !== 0)) {
        iconNameModifier = 'warning'
    }

    const iconName = 'major-networks-' + iconNameModifier

    return bel`${iconName}`
}
