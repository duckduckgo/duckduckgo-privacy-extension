import parseUserAgentString from '../../shared-utils/parse-user-agent-string.es6'
const browserInfo = parseUserAgentString()

const fetch = (message) => {
    return new Promise((resolve, reject) => {
        window.chrome.runtime.sendMessage(message, (result) => resolve(result))
    })
}

const backgroundMessage = (thisModel) => {
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

const getBackgroundTabData = () => {
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

const search = (url) => {
    window.chrome.tabs.create({ url: `https://duckduckgo.com/?q=${url}&bext=${browserInfo.os}cr` })
}

const getExtensionURL = (path) => {
    return chrome.runtime.getURL(path)
}

const openExtensionPage = (path) => {
    window.chrome.tabs.create({ url: getExtensionURL(path) })
}

const openOptionsPage = (browser) => {
    if (browser === 'moz') {
        openExtensionPage('/html/options.html')
        window.close()
    } else {
        window.chrome.runtime.openOptionsPage()
    }
}

const reloadTab = (id) => {
    window.chrome.tabs.reload(id)
}

const closePopup = () => {
    const w = window.chrome.extension.getViews({ type: 'popup' })[0]
    w.close()
}

const startBreakageFlow = (tabId, flowStyle, cb) => {
    fetch({
        breakageFlow: flowStyle,
        tabId
    })
        .then(() => {
            cb()
        })
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
    getExtensionURL: getExtensionURL,
    startBreakageFlow: startBreakageFlow
}
