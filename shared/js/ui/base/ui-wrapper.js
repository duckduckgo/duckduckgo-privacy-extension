import browser from 'webextension-polyfill'

export const sendMessage = async (messageType, options) => {
    return await browser.runtime.sendMessage({ messageType, options })
}

export const backgroundMessage = (thisModel) => {
    // listen for messages from background and
    // // notify subscribers
    browser.runtime.onMessage.addListener((req, sender) => {
        if (sender.id !== browser.runtime.id) return
        if (req.updateTabData) thisModel.send('updateTabData')
        if (req.didResetTrackersData) thisModel.send('didResetTrackersData', req.didResetTrackersData)
        if (req.closePopup) window.close()
    })
}

export const getExtensionURL = (path) => {
    return browser.runtime.getURL(path)
}

export const openExtensionPage = (path) => {
    browser.tabs.create({ url: getExtensionURL(path) })
}
