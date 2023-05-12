import i18next from 'i18next'
import ICU from 'i18next-icu'
import { getUserLocale } from '../../background/i18n'

const localeResources = require('../../../locales/*/*.json', { mode: 'list' })

const resources = localeResources.reduce((mapping, { name, module }) => {
    const [locale, namespace] = name.split('/')
    mapping[locale] = mapping[locale] || {}
    mapping[locale][namespace] = module
    return mapping
}, {})

i18next
    .use(ICU)
    .init({
        initImmediate: false,
        fallbackLng: 'en',
        lng: getUserLocale(),
        ns: ['shared', 'options', 'feedback'],
        defaultNS: 'shared',
        resources
    })

module.exports = i18next
