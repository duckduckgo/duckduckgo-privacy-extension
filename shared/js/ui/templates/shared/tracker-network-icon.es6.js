const bel = require('bel')

module.exports = function (siteRating, isWhitelisted, totalTrackerNetworksCount) {
    let iconNameModifier = 'blocked'

    if (isWhitelisted && (siteRating.before === 'D') && (totalTrackerNetworksCount !== 0)) {
        iconNameModifier = 'warning'
    }

    const iconName = 'major-networks-' + iconNameModifier

    return bel`${iconName}`
}
