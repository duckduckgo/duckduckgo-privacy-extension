const bel = require('bel')

module.exports = function (siteRating, isWhitelisted) {
    let iconNameModifier = 'blocked'

    if (isWhitelisted && (siteRating.before === "D")) {
            iconNameModifier = 'warning'
    }

    let iconName = 'major-networks-' + iconNameModifier

    return bel`${iconName}`
}
