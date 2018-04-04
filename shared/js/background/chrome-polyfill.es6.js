let getExtensionURL = ((path) => {
    return chrome.extension.getURL(path)
})

let getExtensionVersion = (() => {
    const manifest = window.chrome && chrome.runtime.getManifest()
    return manifest.version
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
    getExtensionVersion: getExtensionVersion,
    setBadgeIcon: setBadgeIcon,
    syncToStorage: syncToStorage,
    getFromStorage: getFromStorage
}
