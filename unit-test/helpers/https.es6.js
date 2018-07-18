// stub out https list loading
const load = require('../../shared/js/background/load.es6')

const loadStub = (stubData) => {
    return spyOn(load, 'loadExtensionFile').and.callFake((data) => {
        let response = {getResponseHeader: () => 'fakeEtagValue'}
        if (data.url.match('https-bloom.json')) {
            return Promise.resolve(Object.assign(response, {status: 200, data: stubData.httpsBloom}))
        } else if (data.url.match('https-whitelist.json')) {
            return Promise.resolve(Object.assign(response, {status: 200, data: stubData.httpsWhitelist}))
        } else {
            return Promise.reject(new Error('load error'))
        }
    })
}

module.exports = {
    loadStub
}
