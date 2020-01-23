const mv2 = require('./chrome-wrapper.es6')

mv2.setBadgeIcon = (badgeData, grade) => {
    // TODO setIcon doesn't support paths right now (https://crbug.com/1015136), using setBadgeText for now
    // TODO .action.setIcon is still not available, using browserAction.setIcon for now
    // chrome.action.setIcon(badgeData)
    chrome.browserAction.setBadgeText({
        text: grade || '?',
        tabId: badgeData.tabId
    })
    // just for fun - this can be removed as soon as we can use setIcon again
    let color = '#FF0000'// red

    if (grade) {
        if (grade.startsWith('A') || grade.startsWith('B')) {
            color = '#057017'// green
        }

        if (grade.startsWith('C')) {
            color = '#FF9900'// orange
        }
    } else {
        color = '#AAAAAA'// gray
    }

    chrome.browserAction.setBadgeBackgroundColor({
        color: color,
        tabId: badgeData.tabId
    })
}

module.exports = mv2
