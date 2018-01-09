const bel = require('bel')
const bg = chrome.extension.getBackgroundPage()

module.exports = function () {
    var iconNameModifier = 'blocked',
        site = bg.tab? bg.tab.site : undefined,
        inaMajorTrackingNetwork = (site && site.score)? site.score.inaMajorTrackingNetwork : false

    if (bg.isWhitelisted && (bg.isaMajorTrackingNetwork || inaMajorTrackingNetwork)) {
            iconNameModifier = 'warning'
    }
    var iconName = 'major-networks-' + iconNameModifier

    return bel`${iconName}`
}
