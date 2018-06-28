let getExtensionURL = (path) => {
    return chrome.extension.getURL(path)
}

let getExtensionVersion = () => {
    const manifest = window.chrome && chrome.runtime.getManifest()
    return manifest.version
}

let setBadgeIcon = (badgeData) => {
    chrome.browserAction.setIcon(badgeData)
}

let syncToStorage = (data) => {
    chrome.storage.local.set(data, function () { })
}

let getFromStorage = (key, cb) => {
    chrome.storage.local.get(key, (result) => {
        cb(result[key])
    })
}

let notifyPopup = (message) => {
    chrome.runtime.sendMessage(message)
}

let normalizeTabData = (tabData) => {
    return tabData
}

let mergeSavedSettings = (settings, results) => {
    return Object.assign(settings, results)
}

let getTabsByURL = (url, cb) => {
    chrome.tabs.query({ url }, cb)
}

let executeScript = (tabId, file) => {
    chrome.tabs.executeScript(tabId, {
        file: file
    })
}

let insertCSS = (tabId, file) => {
    chrome.tabs.insertCSS(tabId, {
        file: file
    })
}

let setUninstallURL = (url) => {
    chrome.runtime.setUninstallURL(url)
}

module.exports = {
    getExtensionURL: getExtensionURL,
    getExtensionVersion: getExtensionVersion,
    setBadgeIcon: setBadgeIcon,
    syncToStorage: syncToStorage,
    getFromStorage: getFromStorage,
    notifyPopup: notifyPopup,
    normalizeTabData: normalizeTabData,
    mergeSavedSettings: mergeSavedSettings,
    getTabsByURL: getTabsByURL,
    executeScript: executeScript,
    insertCSS: insertCSS,
    setUninstallURL: setUninstallURL
}
