const getExtensionURL = (path) => {
    return chrome.runtime.getURL(path)
}

const getExtensionVersion = () => {
    const manifest = window.chrome && chrome.runtime.getManifest()
    return manifest.version
}

const setBadgeIcon = (badgeData) => {
    chrome.browserAction.setIcon(badgeData)
}

const syncToStorage = (data) => {
    chrome.storage.local.set(data, function () { })
}

const getFromStorage = (key, cb) => {
    chrome.storage.local.get(key, (result) => {
        cb(result[key])
    })
}
const getFromManagedStorage = (keys, cb) => {
    chrome.storage.managed.get(keys, (result) => {
        if (chrome.runtime.lastError) {
            console.warn('Managed storage not available.', browser.runtime.lastError)
        }
        cb(result || {})
    })
}

const getExtensionId = () => {
    return chrome.runtime.id
}

const notifyPopup = (message) => {
    // this can send an error message when the popup is not open. check lastError to hide it
    chrome.runtime.sendMessage(message, () => chrome.runtime.lastError)
}

const normalizeTabData = (tabData) => {
    return tabData
}

const mergeSavedSettings = (settings, results) => {
    return Object.assign(settings, results)
}

const getDDGTabUrls = () => {
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

const setUninstallURL = (url) => {
    chrome.runtime.setUninstallURL(url)
}

const changeTabURL = (tabId, url) => {
    return new Promise((resolve) => {
        chrome.tabs.update(tabId, { url }, resolve)
    })
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
    getExtensionId: getExtensionId,
    changeTabURL,
    getFromManagedStorage
}
