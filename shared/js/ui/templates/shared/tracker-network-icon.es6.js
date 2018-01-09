const bel = require('bel')
const majorTrackingNetworks = window.constants.majorTrackingNetworks
const bg = chrome.extension.getBackgroundPage()

module.exports = function () {
    var iconNameModifier = 'on'
    if (!bg.isWhitelisted && bg.siteRating.before == 'D') {
            iconNameModifier = 'warning'
    }

    return bel`hero-${iconNameModifier}-major-networks`
}
