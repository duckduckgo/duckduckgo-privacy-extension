let getExtensionURL = ((path) => {
    return safari.extension.baseURI + path
})

let getExtensionVersion = (() => {
    return safari.extension.displayVersion
})

let _getSafariWindowId = ((target) => {
    for(let i = 0; i < safari.extension.toolbarItems.length; i++) {
        if (safari.extension.toolbarItems[i].browserWindow.activeTab === target) {
            return i
        }
    }
})

let setBadgeIcon = ((badgeUpdate) => {
    if (badgeUpdate.target && badgeUpdate.target.activeTab) {
        badgeUpdate.target = badgeUpdate.target.activeTab
    }

    let windowId = _getSafariWindowId(badgeUpdate.target)
    if (badgeUpdate.path && windowId !== undefined) {
        safari.extension.toolbarItems[windowId].image = getExtensionURL(badgeUpdate.path)
        safari.extension.popovers[0].contentWindow.location.reload()
    }
})

let syncToStorage = ((data) => {
    if (data) {
        let key = Object.keys(data)[0]
        let value = data[key]
        if (typeof(value) === 'object') {
            value = JSON.stringify(value)
        }
        localStorage[key] = value
    }
})

let getFromStorage = ((key, cb) => {
    let setting = localStorage[key]
    // try to parse json
    try {
        cb(JSON.parse(setting))
    } catch (e) {
        console.log(e)
        cb(setting)
    }
})

// webextensions can send messages to the popup. In safari the 
// best we can do is refresh it
let notifyPopup = (() => {
    safari.extension.popovers[0].contentWindow.location.reload()
})

module.exports = {
    getExtensionURL: getExtensionURL,
    getExtensionVersion: getExtensionVersion,
    setBadgeIcon: setBadgeIcon,
    syncToStorage: syncToStorage,
    getFromStorage: getFromStorage,
    notifyPopup: notifyPopup
}
