/**
 * We don't have indexedDB for tds storage so we can
 * stub out the get and fallback functions
 */
const tdsStorage = require('../../shared/js/background/storage/tds.es6')

const stub = (arg) => {
    const tdsData = {
        tds: require('./../data/tds.json'),
        surrogates: require('./../data/surrogates.js').surrogates,
        ClickToLoadConfig: require('./../data/clickToLoadConfig.json'),
        config: require('./../data/extension-config.json')
    }

    if (arg) {
        if (arg.config) {
            tdsData.config = arg.config
        }
        if (arg.tds) {
            tdsData.tds = arg.tds
        }
        if (arg.ClickToLoadConfig) {
            tdsData.ClickToLoadConfig = arg.ClickToLoadConfig
        }
    }

    spyOn(tdsStorage, 'getVersionParam').and.returnValue('')

    spyOn(tdsStorage, 'fallbackToDB')
        .and.callFake(key => Promise.resolve(tdsData[key]))

    spyOn(tdsStorage, 'getDataFromLocalDB')
        .and.callFake(key => Promise.resolve(tdsData[key]))

    spyOn(tdsStorage, 'getDataXHR')
        .and.callFake((list, etag, source) => Promise.resolve({ response: 200, data: tdsData[list.name] }))
}
module.exports = {
    stub
}
