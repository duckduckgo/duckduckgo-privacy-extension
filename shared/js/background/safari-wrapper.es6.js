/* global safari:false */
const getExtensionURL = (path) => {
    return safari.extension.baseURI + path
}

const getExtensionVersion = () => {
    return safari.extension.displayVersion
}

const _getSafariWindowId = (target) => {
    for (let i = 0; i < safari.extension.toolbarItems.length; i++) {
        if (safari.extension.toolbarItems[i].browserWindow.activeTab === target) {
            return i
        }
    }
}

const setBadgeIcon = (badgeUpdate) => {
    if (badgeUpdate.target && badgeUpdate.target.activeTab) {
        badgeUpdate.target = badgeUpdate.target.activeTab
    }

    const windowId = _getSafariWindowId(badgeUpdate.target)
    if (badgeUpdate.path && windowId !== undefined) {
        safari.extension.toolbarItems[windowId].image = getExtensionURL(badgeUpdate.path)
        safari.extension.popovers[0].contentWindow.location.reload()
    }
}

const syncToStorage = (data) => {
    if (data) {
        const key = Object.keys(data)[0]
        let value = data[key]
        if (typeof (value) === 'object') {
            value = JSON.stringify(value)
        }
        localStorage[key] = value
    }
}

const getFromStorage = (key, cb) => {
    const setting = localStorage[key]
    // try to parse json
    try {
        cb(JSON.parse(setting))
    } catch (e) {
        console.log(e)
        cb(setting)
    }
}

// webextensions can send messages to the popup. In safari the
// best we can do is refresh it. To keep the popup from refreshing
// too frequently we can set a debounce rate.
const _ = require('underscore')
const reload = () => {
    safari.extension.popovers[0].contentWindow.location.reload()
}
const reloadPopup = _.debounce(reload, 400)
const notifyPopup = (message) => {
    // don't notify whitelist changes. It messes with the popup reloading
    if (message && message.whitelistChanged) return
    reloadPopup()
}

const normalizeTabData = (tabData) => {
    const url = tabData.message ? tabData.message.currentURL : tabData.url
    const newTabData = { url: url, id: getTabId(tabData) }
    newTabData.target = tabData.target
    return newTabData
}

const getTabId = (e) => {
    if (e.target.ddgTabId) return e.target.ddgTabId

    for (const id in safari.application.activeBrowserWindow.tabs) {
        if (safari.application.activeBrowserWindow.tabs[id] === e.target) {
            // prevent race conditions incase another events set a tabId
            if (safari.application.activeBrowserWindow.tabs[id].ddgTabId) {
                return safari.application.activeBrowserWindow.tabs[id].ddgTabId
            }

            const tabId = Math.floor(Math.random() * (100000 - 10 + 1)) + 10
            safari.application.activeBrowserWindow.tabs[id].ddgTabId = tabId
            console.log(safari.application.activeBrowserWindow.tabs[id])
            console.log(`Created Tab id: ${tabId}`)
            return tabId
        }
    }
}

const mergeSavedSettings = (settings, results) => {
    return Object.assign(settings, results)
}

const getDDGTabUrls = () => {
    // we don't currently support getting ATB from install page on Safari
    return Promise.resolve([])
}

// no-ops, in cases where Safari lacks support for something
// or we've achieved it in a different way
const noop = () => { /* noop */ }

module.exports = {
    getExtensionURL: getExtensionURL,
    getExtensionVersion: getExtensionVersion,
    setBadgeIcon: setBadgeIcon,
    syncToStorage: syncToStorage,
    getFromStorage: getFromStorage,
    notifyPopup: notifyPopup,
    normalizeTabData: normalizeTabData,
    getTabId: getTabId,
    mergeSavedSettings: mergeSavedSettings,
    getDDGTabUrls: getDDGTabUrls,
    setUninstallURL: noop
}
