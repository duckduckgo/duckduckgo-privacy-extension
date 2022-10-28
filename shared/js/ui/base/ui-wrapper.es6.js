import browser from 'webextension-polyfill'

const sendMessage = async (messageType, options) => {
    return await browser.runtime.sendMessage({ messageType, options })
}

const backgroundMessage = (thisModel) => {
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

/** @typedef {ReturnType<import('../../background/message-handlers.js').getTab>} Tab */

const getExtensionURL = (path) => {
    return browser.runtime.getURL(path)
}

const openExtensionPage = (path) => {
    browser.tabs.create({ url: getExtensionURL(path) })
}

const openOptionsPage = (browserName) => {
    if (browserName === 'moz') {
        openExtensionPage('/html/options.html')
        window.close()
    } else {
        browser.runtime.openOptionsPage()
    }
}

const reloadTab = (id) => {
    browser.tabs.reload(id)
}

const closePopup = () => {
    const w = browser.extension.getViews({ type: 'popup' })[0]
    w.close()
}

/**
 * Notify the background script that the popup was closed.
 * @param {string[]} userActions - a list of string indicating what actions a user may have taken
 */
const popupUnloaded = (userActions) => {
    const bg = chrome.extension.getBackgroundPage()
    // @ts-ignore
    bg?.popupUnloaded?.(userActions)
}

module.exports = {
    sendMessage,
    reloadTab,
    closePopup,
    backgroundMessage,
    openOptionsPage,
    openExtensionPage,
    getExtensionURL,
    popupUnloaded
}
