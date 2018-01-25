const bel = require('bel')

module.exports = function (siteRating, isWhitelisted, totalTrackersCount) {
  let iconNameModifier = 'blocked'

  if (isWhitelisted && (siteRating.before === 'D') && (totalTrackersCount !== 0)) {
    iconNameModifier = 'warning'
  }

  const iconName = 'major-networks-' + iconNameModifier

  return bel`${iconName}`
}
