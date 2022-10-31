import browser from 'webextension-polyfill'
const { getSetting, updateSetting } = require('./settings')
const browserWrapper = require('./wrapper.es6')
export const REFETCH_ALIAS_ALARM = 'refetchAlias'
const REFETCH_ALIAS_ATTEMPT = 'refetchAliasAttempt'

export const fetchAlias = () => {
    // if another fetch was previously scheduled, clear that and execute now
    browser.alarms.clear(REFETCH_ALIAS_ALARM)

    const userData = getSetting('userData')

    if (!userData?.token) return

    return fetch('https://quack.duckduckgo.com/api/email/addresses', {
        method: 'post',
        headers: { Authorization: `Bearer ${userData.token}` }
    })
        .then(async response => {
            if (response.ok) {
                return response.json().then(async ({ address }) => {
                    if (!/^[a-z0-9]+$/.test(address)) throw new Error('Invalid address')

                    updateSetting('userData', Object.assign(userData, { nextAlias: `${address}` }))
                    // Reset attempts
                    await browserWrapper.removeFromSessionStorage(REFETCH_ALIAS_ATTEMPT)
                    return { success: true }
                })
            } else {
                throw new Error('An error occurred while fetching the alias')
            }
        })
        .catch(async e => {
            // TODO: Do we want to logout if the error is a 401 unauthorized?
            console.log('Error fetching new alias', e)
            // Don't try fetching more than 5 times in a row
            const attempts = await browserWrapper.getFromSessionStorage(REFETCH_ALIAS_ATTEMPT) || 1
            if (attempts < 5) {
                browserWrapper.createAlarm(REFETCH_ALIAS_ALARM, { delayInMinutes: 2 })
                await browserWrapper.setToSessionStorage(REFETCH_ALIAS_ATTEMPT, attempts + 1)
            }
            // Return the error so we can handle it
            return { error: e }
        })
}

const MENU_ITEM_ID = 'ddg-autofill-context-menu-item'
// Create the contextual menu hidden by default
browser.contextMenus.create({
    id: MENU_ITEM_ID,
    title: 'Generate Private Duck Address',
    contexts: ['editable'],
    visible: false
}, () => {
    // It's fine if this context menu already exists, suppress that error.
    // Note: Since webextension-polyfill does not wrap the contextMenus.create
    //       API, the old callback + runtime.lastError approach must be used.
    const { lastError } = browser.runtime
    if (lastError && lastError.message &&
        !lastError.message.startsWith('Cannot create item with duplicate id')) {
        throw lastError
    }
})
browser.contextMenus.onClicked.addListener((info, tab) => {
    const userData = getSetting('userData')
    if (tab?.id && userData.nextAlias) {
        browser.tabs.sendMessage(tab.id, {
            type: 'contextualAutofill',
            alias: userData.nextAlias
        })
    }
})

export const showContextMenuAction = () => browser.contextMenus.update(MENU_ITEM_ID, { visible: true })

export const hideContextMenuAction = () => browser.contextMenus.update(MENU_ITEM_ID, { visible: false })

export const getAddresses = () => {
    const userData = getSetting('userData')
    return {
        personalAddress: userData?.userName,
        privateAddress: userData?.nextAlias
    }
}

/**
 * Given a username, returns a valid email address with the duck domain
 * @param {string} address
 * @returns {string}
 */
export const formatAddress = (address) => address + '@duck.com'

/**
 * Checks formal username validity
 * @param {string} userName
 * @returns {boolean}
 */
export const isValidUsername = (userName) => /^[a-z0-9_]+$/.test(userName)

/**
 * Checks formal token validity
 * @param {string} token
 * @returns {boolean}
 */
export const isValidToken = (token) => /^[a-z0-9]+$/.test(token)

module.exports = {
    REFETCH_ALIAS_ALARM,
    fetchAlias,
    showContextMenuAction,
    hideContextMenuAction,
    getAddresses,
    formatAddress,
    isValidUsername,
    isValidToken
}
