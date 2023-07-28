import i18next from 'i18next'
import ICU from 'i18next-icu'
import { getUserLocale } from '../../background/i18n'
import resources from './locale-resources'

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
