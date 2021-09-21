import { getSetting, updateSetting } from './settings.es6'
export const REFETCH_ALIAS_ALARM = 'refetchAlias'

// Keep track of the number of attempted fetches. Stop trying after 5.
let attempts = 1

export function fetchAlias () {
    // if another fetch was previously scheduled, clear that and execute now
    browser.alarms.get(REFETCH_ALIAS_ALARM, () => browser.alarms.clear(REFETCH_ALIAS_ALARM))

    const userData = getSetting('userData')

    if (!userData?.token) return

    return fetch('https://quack.duckduckgo.com/api/email/addresses', {
        method: 'post',
        headers: { Authorization: `Bearer ${userData.token}` }
    })
        .then(response => {
            if (response.ok) {
                return response.json().then(({ address }) => {
                    if (!/^[a-z0-9]+$/.test(address)) throw new Error('Invalid address')

                    updateSetting('userData', Object.assign(userData, { nextAlias: `${address}` }))
                    // Reset attempts
                    attempts = 1
                    return { success: true }
                })
            } else {
                throw new Error('An error occurred while fetching the alias')
            }
        })
        .catch(e => {
            // TODO: Do we want to logout if the error is a 401 unauthorized?
            console.log('Error fetching new alias', e)
            // Don't try fetching more than 5 times in a row
            if (attempts < 5) {
                browser.alarms.create(REFETCH_ALIAS_ALARM, { delayInMinutes: 2 })
                attempts++
            }
            // Return the error so we can handle it
            return { error: e }
        })
}

const MENU_ITEM_ID = 'ddg-autofill-context-menu-item'
export function createAutofillContextMenuItem () {
    // Create the contextual menu hidden by default
    browser.contextMenus.create({
        id: MENU_ITEM_ID,
        title: 'Use Duck Address',
        contexts: ['editable'],
        visible: false,
        onclick: (info, tab) => {
            const userData = getSetting('userData')
            if (userData.nextAlias) {
                browser.tabs.sendMessage(tab.id, {
                    type: 'contextualAutofill',
                    alias: userData.nextAlias
                })
            }
        }
    })
}

export function showContextMenuAction () {
    return browser.contextMenus.update(MENU_ITEM_ID, { visible: true })
}

export function hideContextMenuAction () {
    return browser.contextMenus.update(MENU_ITEM_ID, { visible: false })
}

export function getAddresses () {
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
export function formatAddress (address) {
    return address + '@duck.com'
}

/**
 * Checks formal username validity
 * @param {string} userName
 * @returns {boolean}
 */
export function isValidUsername (userName) {
    return /^[a-z0-9_]+$/.test(userName)
}

/**
 * Checks formal token validity
 * @param {string} token
 * @returns {boolean}
 */
export function isValidToken (token) {
    return /^[a-z0-9]+$/.test(token)
}
