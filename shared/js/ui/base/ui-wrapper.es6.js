import browser from 'webextension-polyfill'

export const sendMessage = async (messageType, options) => {
    return await browser.runtime.sendMessage({ messageType, options })
}

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
    openOptionsPage,
    openExtensionPage,
    getExtensionURL
}
