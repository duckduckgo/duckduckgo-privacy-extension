import browser from 'webextension-polyfill'

export function getExtensionURL (path) {
    return browser.runtime.getURL(path)
}

export function getExtensionVersion () {
    const manifest = browser.runtime.getManifest()
    return manifest.version
}

export function setBadgeIcon (badgeData) {
    if (chrome.action) {
        chrome.action.setIcon(badgeData)
    } else {
        chrome.browserAction.setIcon(badgeData)
    }
}

export function syncToStorage (data) {
    browser.storage.local.set(data)
}

export async function getFromStorage (key, cb) {
    const result = await browser.storage.local.get(key)
    return result[key]
}

export async function getFromManagedStorage (keys, cb) {
    try {
        return await browser.storage.managed.get(keys)
    } catch (e) {
        console.log('get managed failed', e)
    }
    return {}
}

export function getExtensionId () {
    return browser.runtime.id
}

export async function notifyPopup (message) {
    try {
        await browser.runtime.sendMessage(message)
    } catch {
        // Ignore this as can throw an error message when the popup is not open.
    }
}

export function normalizeTabData (tabData) {
    return tabData
}

export function mergeSavedSettings (settings, results) {
    return Object.assign(settings, results)
}

export async function getDDGTabUrls () {
    const tabs = await browser.tabs.query({ url: 'https://*.duckduckgo.com/*' }) || []

    tabs.forEach(tab => {
        browser.tabs.insertCSS(tab.id, {
            file: '/public/css/noatb.css'
        })
    })

    return tabs.map(tab => tab.url)
}

export function setUninstallURL (url) {
    browser.runtime.setUninstallURL(url)
}

export function changeTabURL (tabId, url) {
    return browser.tabs.update(tabId, { url })
}

export function executeScript (tabId, options) {
    if (chrome.scripting) {
        let frameIds
        if (options.frameId) {
            frameIds = [options.frameId]
        }
        options.target = { tabId, frameIds }
        const files = [options.file]
        options.files = files
        delete options.file
        delete options.matchAboutBlank
        delete options.frameId
        delete options.runAt
        chrome.scripting.executeScript(options)
    } else {
        chrome.tabs.executeScript(tabId, options)
    }
}
