let getExtensionURL = ((path) => {
    return chrome.extension.getURL(path)
})

let setBadgeIcon = ((badgeData) => {
    chrome.browserAction.setIcon(badgeData)
})

module.exports = {
    getExtensionURL: getExtensionURL,
    setBadgeIcon: setBadgeIcon
}
