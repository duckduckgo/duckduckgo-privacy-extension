/* global DEBUG */
import browser from 'webextension-polyfill'
import { registerMessageHandler } from '../message-handlers'

const VERIFICATION_HOST = 'use-login.duckduckgo.com'
const SETTINGS_KEY = 'isInternalUser'

/**
 * Is the user a DDG employee
 * @param {import('../settings.js')} settings
 */
export function isInternalUser (settings) {
    return settings.getSetting(SETTINGS_KEY) || DEBUG
}

export default class InternalUserDetector {
    /**
     * @param {{
    *  settings: import('../settings.js');
    * }} options
    */
    constructor ({ settings }) {
        this.settings = settings
        browser.webRequest.onCompleted.addListener((details) => {
            if (details.statusCode === 200) {
                settings.updateSetting(SETTINGS_KEY, true)
            }
        }, {
            urls: [`https://${VERIFICATION_HOST}/*`]
        })
        registerMessageHandler('isInternalUser', this.isInternalUser.bind(this))
    }

    isInternalUser () {
        return isInternalUser(this.settings)
    }
}
