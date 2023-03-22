/**
 * We don't have indexedDB for tds storage so we can
 * stub out the get and fallback functions
 */
const tdsStorage = require('../../shared/js/background/storage/tds').default

const stub = (arg) => {
    const onUpdateListeners = new Map()
    const tdsData = {
        tds: require('./../data/tds.json'),
        surrogates: require('./../data/surrogates.js').surrogates,
        config: require('./../data/extension-config.json')
    }

    if (arg) {
        if (arg.config) {
            tdsData.config = arg.config
        }
        if (arg.tds) {
            tdsData.tds = arg.tds
        }
    }

    spyOn(tdsStorage, 'getVersionParam').and.returnValue('')

    spyOn(tdsStorage, 'getListFromLocalDB')
        .and.callFake(key => Promise.resolve(tdsData[key]))

    spyOn(tdsStorage, 'getDataXHR')
        .and.callFake((list, etag, source) => Promise.resolve({ response: 200, data: tdsData[list.name] }))

    spyOn(tdsStorage, 'onUpdate')
        .and.callFake((configName, listener) => {
            let listeners = onUpdateListeners.get(configName)
            if (!listeners) {
                listeners = []
                onUpdateListeners.set(configName, listeners)
            }
            listeners.push(listener)
        })

    return { onUpdateListeners, tdsData }
}
module.exports = {
    stub
}
