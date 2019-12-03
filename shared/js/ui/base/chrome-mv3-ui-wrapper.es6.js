let fetch = (message) => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (result) => resolve(result))
    })
}

let backgroundMessage = (thisModel) => {
    // listen for messages from background and
    // // notify subscribers
    chrome.runtime.onMessage.addListener((req, sender) => {
        if (sender.id !== chrome.runtime.id) return
        if (req.whitelistChanged) thisModel.send('whitelistChanged')
        if (req.updateTabData) thisModel.send('updateTabData')
        if (req.didResetTrackersData) thisModel.send('didResetTrackersData', req.didResetTrackersData)
        if (req.closePopup) window.close()//FIXME
    })
}

let getBackgroundTabData = () => {
    return new Promise((resolve, reject) => {
        fetch({getCurrentTab: true}).then((tab) => {
            if (tab) {
                fetch({getTab: tab.id}).then((backgroundTabObj) => {
                    resolve(backgroundTabObj)
                })
            }
        })
    })
}

let search = (url) => {
    chrome.tabs.create({url: `https://duckduckgo.com/?q=${url}&bext=${window.localStorage['os']}cr`})
}

let getExtensionURL = (path) => {
    return chrome.extension.getURL(path)
}

let openExtensionPage = (path) => {
    chrome.tabs.create({ url: getExtensionURL(path) })
}

let openOptionsPage = (browser) => {
    if (browser === 'moz') {
        openExtensionPage('/html/options.html')
        window.close()
    } else if (browser === 'chrome') {
        chrome.runtime.openOptionsPage()
    }
}

let reloadTab = (id) => {
    chrome.tabs.reload(id)
}

let closePopup = () => {
    const w = chrome.extension.getViews({type: 'popup'})[0]
    w.close()
}

module.exports = {
    fetch: fetch,
    reloadTab: reloadTab,
    closePopup: closePopup,
    backgroundMessage: backgroundMessage,
    getBackgroundTabData: getBackgroundTabData,
    search: search,
    openOptionsPage: openOptionsPage,
    openExtensionPage: openExtensionPage,
    getExtensionURL: getExtensionURL
}
