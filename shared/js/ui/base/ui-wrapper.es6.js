import browser from 'webextension-polyfill'

export const sendMessage = async (messageType, options) => {
    return await browser.runtime.sendMessage({ messageType, options })
}

export const backgroundMessage = (thisModel) => {
    // listen for messages from background and
    // // notify subscribers
    browser.runtime.onMessage.addListener((req, sender) => {
        if (sender.id !== browser.runtime.id) return
        if (req.allowlistChanged) thisModel.send('allowlistChanged')
        if (req.updateTabData) thisModel.send('updateTabData')
        if (req.didResetTrackersData) thisModel.send('didResetTrackersData', req.didResetTrackersData)
        if (req.closePopup) window.close()
    })
}

/** @typedef {ReturnType<import('../../background/message-handlers.js').getTab>} TabState */

const getExtensionURL = (path) => {
    return browser.runtime.getURL(path)
}

export const openExtensionPage = (path) => {
    browser.tabs.create({ url: getExtensionURL(path) })
}

export const openOptionsPage = (browserName) => {
    if (browserName === 'moz') {
        openExtensionPage('/html/options.html')
        window.close()
    } else {
        browser.runtime.openOptionsPage()
    }
}

export const reloadTab = (id) => {
    browser.tabs.reload(id)
}

export const closePopup = () => {
    const w = browser.extension.getViews({ type: 'popup' })[0]
    w.close()
}

module.exports = {
    sendMessage,
    reloadTab,
    closePopup,
    backgroundMessage,
    openOptionsPage,
    openExtensionPage,
    getExtensionURL,
}
