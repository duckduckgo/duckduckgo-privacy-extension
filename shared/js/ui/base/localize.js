import i18next from 'i18next'
import ICU from 'i18next-icu'

const localeResources = require('../../../locales/*/*.json', { mode: 'list' })

const resources = localeResources.reduce((mapping, { name, module }) => {
    const [locale, namespace] = name.split('/')
    mapping[locale] = mapping[locale] || {}
    mapping[locale][namespace] = module
    return mapping
}, {})

function getBrowserLocale () {
    const browserLocale = chrome.i18n ? chrome.i18n.getUILanguage() : navigator.language
    return browserLocale.split('-')[0] // drop country suffix
}

i18next
    .use(ICU)
    .init({
        debug: true,
        initImmediate: false,
        fallbackLng: 'en',
        lng: getBrowserLocale(),
        ns: ['shared', 'options'],
        defaultNS: 'shared',
        resources: resources
    })

module.exports = i18next
