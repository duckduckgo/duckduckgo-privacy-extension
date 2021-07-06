/**
 * We don't have indexedDB for tds storage so we can
 * stub out the get and fallback functions
 */
 const configStorage = require('../../shared/js/background/storage/config.es6')
 const configData = {
     privacyFeatures: {
        referrer: {
            state: 'enabled',
            exceptions: require('./../data/fpExcludeLists.js').referrer.excludedReferrers
        },
        clickToPlay: {
            state: 'enabled'
        }
     },
     unprotectedTemporary: require('./../data/brokensites.js').brokenSites,
 }
 
 const stub = () => {
     spyOn(configStorage, 'loadConfig').and.callFake(function(configName, callback) {
         callback({ extensionConfig: configData })
     })
 }
 module.exports = {
     stub,
     configData
 }
 