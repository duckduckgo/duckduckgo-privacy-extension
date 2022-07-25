import browser from 'webextension-polyfill'

const { getCurrentTab } = require('../background/utils.es6.js')

/**
 * @type {(<T extends Element>(searchIn: T,      selector: string) => T)
 * &      (                   (searchIn: string, selector?: null)  => HTMLElement)
 * }
 */
export const querySelectorOrFail = (searchIn, selector) => {
    let realSearchIn, realSelector
    if (typeof searchIn === 'string') {
        realSearchIn = document
        realSelector = searchIn
    } else {
        realSearchIn = searchIn
        realSelector = selector
    }
    const elt = realSearchIn.querySelector(realSelector)
    if (elt === null) {
        throw new Error(`could not find an element for selector: ${realSelector}`)
    }
    return elt
}

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
export function getElementByIdOrFail(id) {
    const elt = document.getElementById(id)
    if (elt === null) {
        throw new Error(`could not find an element with the given ID: ${id}`)
    }
    return elt
}

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
