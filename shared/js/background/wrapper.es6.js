import browser from 'webextension-polyfill'

export function getExtensionURL (path) {
    return browser.runtime.getURL(path)
}

export function getExtensionVersion () {
    const manifest = browser && browser.runtime.getManifest()
    return manifest.version
}

export function setBadgeIcon (badgeData) {
    browser.browserAction.setIcon(badgeData)
}

export function syncToStorage (data) {
    chrome.storage.local.set(data, function () { })
}

export function getFromStorage (key, cb) {
    chrome.storage.local.get(key, (result) => {
        cb(result[key])
    })
}
export function getFromManagedStorage (keys, cb) {
    chrome.storage.managed.get(keys, (result) => {
        if (chrome.runtime.lastError) {
            console.warn('Managed storage not available.', browser.runtime.lastError)
        }
        cb(result || {})
    })
}

export function getExtensionId () {
    return browser.runtime.id
}

export function notifyPopup (message) {
    // this can send an error message when the popup is not open. check lastError to hide it
    chrome.runtime.sendMessage(message, () => chrome.runtime.lastError)
}

export function normalizeTabData (tabData) {
    return tabData
}

export function mergeSavedSettings (settings, results) {
    return Object.assign(settings, results)
}

export function getDDGTabUrls () {
    return new Promise((resolve) => {
        chrome.tabs.query({ url: 'https://*.duckduckgo.com/*' }, (tabs) => {
            tabs = tabs || []

            tabs.forEach(tab => {
                browser.tabs.insertCSS(tab.id, {
                    file: '/public/css/noatb.css'
                })
            })

            resolve(tabs.map(tab => tab.url))
        })
    })
}

export function setUninstallURL (url) {
    browser.runtime.setUninstallURL(url)
}

export function changeTabURL (tabId, url) {
    return new Promise((resolve) => {
        chrome.tabs.update(tabId, { url }, resolve)
    })
}
