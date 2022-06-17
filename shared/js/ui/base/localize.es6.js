import i18next from 'i18next'
import ICU from 'i18next-icu'

const supportedLocales = require('../../../data/constants.js').supportedLocales

function buildLocalesList () {
    const resources = {}
    // hard coding for now till we figure out dynamic bundling
    resources.en = {
        shared: require('../../../locales/en/shared.json'),
        options: require('../../../locales/en/options.json')
    }
    return resources
}

function getLocale (supportedLocales) {
    // truncate locale by dropping country suffix
    let browserLocale = chrome.i18n ? chrome.i18n.getUILanguage() : navigator.language
    browserLocale = browserLocale.split('-')[0]

    return supportedLocales.includes[browserLocale] || 'en' // probably redundant due to fallbackLng in init() below?
}

i18next
    .use(ICU)
    .init({
        debug: true,
        initImmediate: false,
        fallbackLng: 'en',
        lng: getLocale(supportedLocales),
        ns: ['shared', 'options'],
        defaultNS: 'shared',
        resources: buildLocalesList()
    })

module.exports = i18next
