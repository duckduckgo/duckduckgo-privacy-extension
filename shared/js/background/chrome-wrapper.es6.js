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

let getExtensionId = () => {
    return chrome.runtime.id
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

let getDDGTabUrls = () => {
    return new Promise((resolve) => {
        chrome.tabs.query({ url: 'https://*.duckduckgo.com/*' }, (tabs) => {
            tabs = tabs || []

            tabs.forEach(tab => {
                chrome.tabs.insertCSS(tab.id, {
                    file: '/public/css/noatb.css'
                })
            })

            resolve(tabs.map(tab => tab.url))
        })
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
    getDDGTabUrls: getDDGTabUrls,
    setUninstallURL: setUninstallURL,
    getExtensionId: getExtensionId
}
