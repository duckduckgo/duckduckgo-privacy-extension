/**
 * We don't have indexedDB for tds storage so we can
 * stub out the get and fallback functions
 */
const tdsStorage = require('../../shared/js/background/storage/tds.es6')
const tdsData = {
    brokenSiteList: require('./../data/brokensites.js').brokenSites.split('\n'),
    fingerprinting: require('./../data/fingerprinting.json'),
    tds: require('./../data/tds.json'),
    surrogates: require('./../data/surrogates.js').surrogates,
    ReferrerExcludeList: require('./../data/fpExcludeLists.js').referrer,
    ClickToLoadConfig: require('./../data/clickToLoadConfig.json')
}

const stub = () => {
    spyOn(tdsStorage, 'getVersionParam').and.returnValue('')

    spyOn(tdsStorage, 'fallbackToDB')
        .and.callFake(key => Promise.resolve(tdsData[key]))

    spyOn(tdsStorage, 'getDataFromLocalDB')
        .and.callFake(key => Promise.resolve(tdsData[key]))

    spyOn(tdsStorage, 'getDataXHR')
        .and.callFake((list, etag, source) => Promise.resolve({ response: 200, data: tdsData[list] }))
}
module.exports = {
    stub
}
