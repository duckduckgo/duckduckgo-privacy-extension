/**
 * We don't have indexedDB for tds storage so we can
 * stub out the get and fallback functions
 */
const configStorage = require('../../shared/js/background/storage/config.es6')
const configData = {
    features: {
        referrer: {
            state: 'enabled',
            exceptions: require('./../data/fpExcludeLists.js').referrer.excludedReferrers
        },
        clickToPlay: {
            state: 'enabled'
        }
    },
    unprotectedTemporary: require('./../data/brokensites.js').brokenSites
}

const stub = () => {
    spyOn(configStorage, 'loadConfig').and.callFake(function (configName, callback) {
        const config = { extensionConfig: configData }
        callback(config)
    })
}
module.exports = {
    stub,
    configData
}
