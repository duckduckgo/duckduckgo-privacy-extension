let getExtensionURL = ((path) => {
    return chrome.extension.getURL(path)
})

let setBadgeIcon = ((badgeData) => {
    chrome.browserAction.setIcon(badgeData)
})

let syncToStorage = ((data) => {
    chrome.storage.local.set(data, function() { });
})

let getFromStorage = ((key, cb) => {
    chrome.storage.local.get(key, ((result) => {
        cb(result[key])
    }))
})

module.exports = {
    getExtensionURL: getExtensionURL,
    setBadgeIcon: setBadgeIcon,
    syncToStorage: syncToStorage,
    getFromStorage: getFromStorage
}
