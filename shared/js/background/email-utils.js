import browser from 'webextension-polyfill'

import { getURL } from './pixels'
import load from './load'
const { getSetting, updateSetting } = require('./settings')
const browserWrapper = require('./wrapper')
const utils = require('./utils')

export const REFETCH_ALIAS_ALARM = 'refetchAlias'
const REFETCH_ALIAS_ATTEMPT = 'refetchAliasAttempt'

const pixelsEnabled = utils.getBrowserName() !== 'moz'

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
    documentUrlPatterns: ['https://*/*'],
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

function sendPixelRequest (pixelName, params = {}) {
    const randomNum = Math.ceil(Math.random() * 1e7)
    const searchParams = new URLSearchParams(Object.entries(params))
    const url = getURL(pixelName) + `?${randomNum}&${searchParams.toString()}`
    load.url(url)
}

function currentDate () {
    return new Date().toLocaleString('en-CA', {
        timeZone: 'America/New_York',
        dateStyle: 'short'
    })
}

const getFullPixelName = (name, browserName) => {
    return `${name}_${browserName.toLowerCase()}`
}

const fireAddressUsedPixel = (pixel) => {
    const browserName = utils.getBrowserName() ?? 'unknown'
    if (!pixelsEnabled) return

    const userData = getSetting('userData')
    if (!userData?.userName) return

    const lastAddressUsedAt = getSetting('lastAddressUsedAt') ?? ''

    sendPixelRequest(getFullPixelName(pixel, browserName), { duck_address_last_used: lastAddressUsedAt, cohort: userData.cohort })
    updateSetting('lastAddressUsedAt', currentDate())
}

const fireIncontextSignupPixel = (pixel) => {
    const browserName = utils.getBrowserName() ?? 'unknown'
    if (!pixelsEnabled) return

    sendPixelRequest(getFullPixelName(pixel, browserName))
}

/**
 * Config type definition
 * @typedef {Object} FirePixelOptions
 * @property {import('@duckduckgo/autofill/src/deviceApiCalls/__generated__/validators-ts').SendJSPixelParams['pixelName']} pixelName
 */

/**
 *
 * @param {FirePixelOptions}  options
 */
export const sendJSPixel = (options) => {
    const { pixelName } = options
    switch (pixelName) {
    case 'autofill_show':
        fireAddressUsedPixel('email_tooltip_show_extension')
        break
    case 'autofill_private_address':
        fireAddressUsedPixel('email_filled_random_extension')
        break
    case 'autofill_personal_address':
        fireAddressUsedPixel('email_filled_main_extension')
        break
    case 'incontext_show':
        fireIncontextSignupPixel('incontext_show_extension')
        break
    case 'incontext_primary_cta':
        fireIncontextSignupPixel('incontext_primary_cta_extension')
        break
    case 'incontext_dismiss_persisted':
        fireIncontextSignupPixel('incontext_dismiss_persisted_extension')
        break
    case 'incontext_close_x':
        fireIncontextSignupPixel('incontext_close_x_extension')
        break
    default:
        console.error('Unknown pixel name', pixelName)
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
