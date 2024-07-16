import browser from 'webextension-polyfill'

export function getUserLocale () {
    if (!browser?.i18n) {
        return 'en'
    }
    // returns browser locale with country suffix removed
    const lang = browser.i18n.getUILanguage().slice(0, 2)
    // handle Norwegian locales
    if (['nn', 'no'].includes(lang)) {
        return 'nb'
    }
    return lang
}

export function getFullUserLocale () {
    if (!browser?.i18n) {
        return 'en-US'
    }

    return browser.i18n.getUILanguage()
}
