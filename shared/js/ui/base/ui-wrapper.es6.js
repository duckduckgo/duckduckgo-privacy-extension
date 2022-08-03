import parseUserAgentString from '../../shared-utils/parse-user-agent-string.es6'
import browser from 'webextension-polyfill'
const browserInfo = parseUserAgentString()

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

/**
 * @returns {Promise<Tab|undefined>}
 */
async function getBackgroundTabData () {
    const url = new URL(window.location.href)
    let tabId
    // Used for ui debugging to open the dashboard in a new tab and set the tabId manually.
    if (url.searchParams.has('tabId')) {
        tabId = Number(url.searchParams.get('tabId'))
    }
    if (!tabId) {
        const tab = await sendMessage('getCurrentTab')
        if (tab) {
            tabId = tab.id
        }
    }
    if (tabId) {
        /** @type {Tab} */
        const backgroundTabObj = await sendMessage('getTab', tabId)
        return backgroundTabObj
    }
}

const search = (url) => {
    browser.tabs.create({ url: `https://duckduckgo.com/?q=${url}&bext=${browserInfo.os}cr` })
}

const getExtensionURL = (path) => {
    return browser.runtime.getURL(path)
}

const openExtensionPage = (path) => {
    browser.tabs.create({ url: getExtensionURL(path) })
}

const openOptionsPage = () => {
    openExtensionPage('/html/options.html')
    window.close()
}

const reloadTab = (id) => {
    browser.tabs.reload(id)
}

const closePopup = () => {
    const w = browser.extension.getViews({ type: 'popup' })[0]
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
