import browser from 'webextension-polyfill'

const { getCurrentTab } = require('../background/message-handlers.js')

/**
 * Open a devtools panel page for monitoring the current tab.
 */
export function openDevtoolsCurrentTab() {
    getCurrentTab().then((tabToMonitor) => {
        browser.tabs.create({
            url: browser.runtime.getURL(`/html/devtools-panel.html?tabId=${tabToMonitor.id}`)
        })
    })
}

/**
 * Adds the context menu item for the devtools panel.
 */
export function registerDevPanelContextMenuItem() {
    const DEVPANEL_MENU_ITEM_ID = 'ddg-devpanel-context-menu-item'
    browser.contextMenus.create({
        id: DEVPANEL_MENU_ITEM_ID,
        title: 'Open devpanel',
        contexts: ['all'],
        visible: true
    }, () => {
        // It's fine if this context menu already exists, suppress that error.
        // Note: Since webextension-polyfill does not wrap the contextMenus.create
        //       API, the old callback + runtime.lastError approach must be used.
        const { lastError } = browser.runtime
        if (lastError &&
            !lastError.message.startsWith('Cannot create item with duplicate id')) {
            throw lastError
        }
    })
    browser.contextMenus.onClicked.addListener((info, tab) => {
        openDevtoolsCurrentTab()
    })
}
