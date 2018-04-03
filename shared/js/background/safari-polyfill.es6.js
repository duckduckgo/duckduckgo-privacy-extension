let getExtensionURL = ((path) => {
    return safari.extension.baseURI + path
})

let _getSafariWindowId = ((target) => {
    for(let i = 0; i < safari.extension.toolbarItems.length; i++) {
        if (safari.extension.toolbarItems[i].browserWindow.activeTab === target) {
            return i
        }
    }
})

let getSafariTabIndex = ((target) => {
    for (let i = 0; i < safari.application.activeBrowserWindow.tabs.length; i++) {
        if (target === safari.application.activeBrowserWindow.tabs[i]) {
            return i
        }
    }
})

let setBadgeIcon = ((iconPath, target) => {
    if (target.activeTab) target = target.activeTab

    let windowId = _getSafariWindowId(target)
    if (iconPath && windowId !== undefined) {
        safari.extension.toolbarItems[windowId].image = safari.extension.baseURI + iconPath
        safari.extension.popovers[0].contentWindow.location.reload()
    }
})

let syncToStorage = ((data) => {
    if (data) {
        let key = Object.keys(data)[0]
        localStorage[key] = JSON.stringify(data[key])
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

module.exports = {
    getExtensionURL: getExtensionURL,
    setBadgeIcon: setBadgeIcon,
    syncToStorage: syncToStorage,
    getFromStorage: getFromStorage
}
