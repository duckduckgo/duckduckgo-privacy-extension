const mv2 = require('./chrome-wrapper.es6')

mv2.setBadgeIcon = (badgeData, grade) => {
    // TODO setIcon doesn't support paths right now (https://crbug.com/1015136), using setBadgeText for now
    // TODO .action.setIcon is still not available, using browserAction.setIcon for now
    // chrome.action.setIcon(badgeData)
    chrome.browserAction.setBadgeText({
        text: grade || '?',
        tabId: badgeData.tabId
    })
}

module.exports = mv2
