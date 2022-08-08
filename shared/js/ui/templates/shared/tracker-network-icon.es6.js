const bel = require('bel')

module.exports = function (siteRating, protectionsEnabled, totalTrackerNetworksCount) {
    let iconNameModifier = 'blocked'

    if (protectionsEnabled) {
        iconNameModifier = 'warning'
    }

    const iconName = 'major-networks-' + iconNameModifier

    return bel`${iconName}`
}
