/* global safari:false */
let getExtensionURL = (path) => {
    return safari.extension.baseURI + path
}

let getExtensionVersion = () => {
    return safari.extension.displayVersion
}

let _getSafariWindowId = (target) => {
    for (let i = 0; i < safari.extension.toolbarItems.length; i++) {
        if (safari.extension.toolbarItems[i].browserWindow.activeTab === target) {
            return i
        }
    }
}

let setBadgeIcon = (badgeUpdate) => {
    if (badgeUpdate.target && badgeUpdate.target.activeTab) {
        badgeUpdate.target = badgeUpdate.target.activeTab
    }

    let windowId = _getSafariWindowId(badgeUpdate.target)
    if (badgeUpdate.path && windowId !== undefined) {
        safari.extension.toolbarItems[windowId].image = getExtensionURL(badgeUpdate.path)
        safari.extension.popovers[0].contentWindow.location.reload()
    }
}

let syncToStorage = (data) => {
    if (data) {
        let key = Object.keys(data)[0]
        let value = data[key]
        if (typeof (value) === 'object') {
            value = JSON.stringify(value)
        }
        localStorage[key] = value
    }
}

let getFromStorage = (key, cb) => {
    let setting = localStorage[key]
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
var _ = require('underscore')
let reload = () => {
    safari.extension.popovers[0].contentWindow.location.reload()
}
let reloadPopup = _.debounce(reload, 400)
let notifyPopup = (message) => {
    // don't notify whitelist changes. It messes with the popup reloading
    if (message && message.whitelistChanged) return
    reloadPopup()
}

let normalizeTabData = (tabData) => {
    let url = tabData.message ? tabData.message.currentURL : tabData.url
    let newTabData = {url: url, id: getTabId(tabData)}
    newTabData.target = tabData.target
    return newTabData
}

let getTabId = (e) => {
    if (e.target.ddgTabId) return e.target.ddgTabId

    for (let id in safari.application.activeBrowserWindow.tabs) {
        if (safari.application.activeBrowserWindow.tabs[id] === e.target) {
            // prevent race conditions incase another events set a tabId
            if (safari.application.activeBrowserWindow.tabs[id].ddgTabId) {
                return safari.application.activeBrowserWindow.tabs[id].ddgTabId
            }

            let tabId = Math.floor(Math.random() * (100000 - 10 + 1)) + 10
            safari.application.activeBrowserWindow.tabs[id].ddgTabId = tabId
            console.log(safari.application.activeBrowserWindow.tabs[id])
            console.log(`Created Tab id: ${tabId}`)
            return tabId
        }
    }
}

let mergeSavedSettings = (settings, results) => {
    return Object.assign(settings, results)
}

let getDDGTabUrls = () => {
    // we don't currently support getting ATB from install page on Safari
    return Promise.resolve([])
}

// no-ops, in cases where Safari lacks support for something
// or we've achieved it in a different way
let noop = () => { /* noop */ }

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
