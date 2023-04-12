import browser from 'webextension-polyfill'

export function getUserLocale () {
    // returns browser locale with country suffix removed
    return browser.i18n.getUILanguage().slice(2)
}
