import parseUserAgentString from '../../shared-utils/parse-user-agent-string.es6'
import browser from 'webextension-polyfill'
const browserInfo = parseUserAgentString()

const sendMessage = async (messageType, options) => {
    return await browser.runtime.sendMessage({ messageType, options })
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
        sendMessage('getCurrentTab').then((tab) => {
            if (tab) {
                sendMessage('getTab', tab.id).then((backgroundTabObj) => {
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

module.exports = {
    sendMessage,
    reloadTab: reloadTab,
    closePopup: closePopup,
    backgroundMessage: backgroundMessage,
    getBackgroundTabData: getBackgroundTabData,
    search: search,
    openOptionsPage: openOptionsPage,
    openExtensionPage: openExtensionPage,
    getExtensionURL: getExtensionURL
}
