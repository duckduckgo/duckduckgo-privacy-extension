export function fetch (message) {
    return new Promise((resolve, reject) => {
        window.chrome.runtime.sendMessage(message, (result) => resolve(result))
    })
}

export function backgroundMessage (thisModel) {
    // listen for messages from background and
    // // notify subscribers
    window.chrome.runtime.onMessage.addListener((req, sender) => {
        if (sender.id !== chrome.runtime.id) return
        if (req.allowlistChanged) thisModel.send('allowlistChanged')
        if (req.updateTabData) thisModel.send('updateTabData')
        if (req.didResetTrackersData) thisModel.send('didResetTrackersData', req.didResetTrackersData)
        if (req.closePopup) window.close()
    })
}

export function getBackgroundTabData () {
    return new Promise((resolve, reject) => {
        fetch({ getCurrentTab: true }).then((tab) => {
            if (tab) {
                fetch({ getTab: tab.id }).then((backgroundTabObj) => {
                    resolve(backgroundTabObj)
                })
            }
        })
    })
}

export function search (url) {
    window.chrome.tabs.create({ url: `https://duckduckgo.com/?q=${url}&bext=${window.localStorage.os}cr` })
}

export function getExtensionURL (path) {
    return chrome.runtime.getURL(path)
}

export function openExtensionPage (path) {
    window.chrome.tabs.create({ url: getExtensionURL(path) })
}

export function openOptionsPage (browser) {
    if (browser === 'moz') {
        openExtensionPage('/html/options.html')
        window.close()
    } else {
        window.chrome.runtime.openOptionsPage()
    }
}

export function reloadTab (id) {
    window.chrome.tabs.reload(id)
}

export function closePopup () {
    const w = window.chrome.extension.getViews({ type: 'popup' })[0]
    w.close()
}
