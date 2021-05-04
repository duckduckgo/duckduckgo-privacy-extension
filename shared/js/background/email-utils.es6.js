const { getSetting, updateSetting } = require('./settings.es6')
const REFETCH_ALIAS_ALARM = 'refetchAlias'

// Keep track of the number of attempted fetches. Stop trying after 5.
let attempts = 1

const fetchAlias = () => {
    // if another fetch was previously scheduled, clear that and execute now
    chrome.alarms.get(REFETCH_ALIAS_ALARM, () => chrome.alarms.clear(REFETCH_ALIAS_ALARM))

    const userData = getSetting('userData')

    if (!userData.token) return

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
                chrome.alarms.create(REFETCH_ALIAS_ALARM, { delayInMinutes: 2 })
                attempts++
            }
            // Return the error so we can handle it
            return { error: e }
        })
}

const MENU_ITEM_ID = 'ddg-autofill-context-menu-item'
// Create the contextual menu hidden by default
chrome.contextMenus.create({
    id: MENU_ITEM_ID,
    title: 'Use Duck Address',
    contexts: ['editable'],
    visible: false,
    onclick: (info, tab) => {
        const userData = getSetting('userData')
        if (userData.nextAlias) {
            chrome.tabs.sendMessage(tab.id, {
                type: 'contextualAutofill',
                alias: userData.nextAlias
            })
        }
    }
})

const showContextMenuAction = () => chrome.contextMenus.update(MENU_ITEM_ID, { visible: true })

const hideContextMenuAction = () => chrome.contextMenus.update(MENU_ITEM_ID, { visible: false })

const getAddresses = () => {
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
const formatAddress = (address) => address + '@duck.com'

/**
 * Checks formal username validity
 * @param {string} userName
 * @returns {boolean}
 */
const isValidUsername = (userName) => /^[a-z0-9_]+$/.test(userName)

/**
 * Checks formal token validity
 * @param {string} token
 * @returns {boolean}
 */
const isValidToken = (token) => /^[a-z0-9]+$/.test(token)

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
