let getExtensionURL = ((path) => {
    return safari.extension.baseURI + path
})

function _getSafariWindowId (target) {
    for(let i = 0; i < safari.extension.toolbarItems.length; i++) {
        if (safari.extension.toolbarItems[i].browserWindow.activeTab === target) {
            return i
        }
    }
}

function getSafariTabIndex (target) {
    for (let i = 0; i < safari.application.activeBrowserWindow.tabs.length; i++) {
        if (target === safari.application.activeBrowserWindow.tabs[i]) {
            return i
        }
    }
}


function setBadgeIcon (iconPath, target) {
    if (target.activeTab) target = target.activeTab

    let windowId = _getSafariWindowId(target)
    if (iconPath && windowId !== undefined) {
        safari.extension.toolbarItems[windowId].image = safari.extension.baseURI + iconPath
        safari.extension.popovers[0].contentWindow.location.reload()
    }
}

module.exports = {
    getExtensionURL: getExtensionURL,
    setBadgeIcon: setBadgeIcon
}
