import i18next from 'i18next'
import ICU from 'i18next-icu'

const supportedLocales = require('../../../data/constants.js').supportedLocales

function buildLocalesList (locales) {
    const resources = {}
    // hard coding for now till we figure out dynamic bundling
    resources.en = {
        shared: require('../../../locales/en/shared.json'),
        options: require('../../../locales/en/options.json')
    }
    return resources
}

i18next
    .use(ICU)
    .init({
        debug: true,
        initImmediate: false,
        fallbackLng: 'en',
        lng: 'en',
        ns: ['shared', 'options'],
        defaultNS: 'shared',
        resources: buildLocalesList(supportedLocales)
    })

module.exports = i18next