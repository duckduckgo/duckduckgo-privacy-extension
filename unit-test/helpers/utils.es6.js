// stub out util entitylist list loading
const load = require('../../shared/js/background/load.es6')

const loadStub = (stubData) => {
    return spyOn(load, 'loadExtensionFile').and.callFake((data) => {
        const response = { getResponseHeader: () => Math.floor(Math.random() * Math.floor(10)) }
        if (data.url.match('tds')) {
            return Promise.resolve(Object.assign(response, { status: 200, data: stubData.tds }))
        } else if (data.url.match('surrogates')) {
            return Promise.resolve(Object.assign(response, { status: 200, data: stubData.surrogates }))
        } else if (data.url.match('whitelist-temporary')) {
            return Promise.resolve(Object.assign(response, { status: 200, data: stubData.brokenSitess }))
        } else {
            return Promise.reject(new Error('load error'))
        }
    })
}

module.exports = {
    loadStub
}
