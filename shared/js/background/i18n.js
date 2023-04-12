import browser from 'webextension-polyfill'

export function getUserLocale() {
    return browser.i18n.getUILanguage()
}
