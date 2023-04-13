import browser from 'webextension-polyfill'

export function getUserLocale () {
    if (!browser?.i18n) {
        return 'en'
    }
    // returns browser locale with country suffix removed
    return browser.i18n.getUILanguage().slice(0, 2)
}
