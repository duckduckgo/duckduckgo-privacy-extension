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

    spyOn(tdsStorage, 'onUpdate')
        .and.callFake((configName, listener) => {
            let listeners = onUpdateListeners.get(configName)
            if (!listeners) {
                listeners = []
                onUpdateListeners.set(configName, listeners)
            }
            listeners.push(listener)
        })

    spyOn(tdsStorage, 'getLists').and.callFake(() => {
        return Promise.resolve([{
            name: 'tds',
            data: tdsData.tds
        }, {
            name: 'config',
            data: tdsData.config
        }, {
            name: 'surrogates',
            data: tdsData.surrogates
        }])
    })

    spyOn(tdsStorage, 'ready').and.callFake(() => Promise.resolve())
    Object.assign(tdsStorage, tdsData)

    return { onUpdateListeners, tdsData }
}
module.exports = {
    stub
}
