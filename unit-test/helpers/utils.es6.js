// stub out util entitylist list loading
const load = require('../../shared/js/background/load.es6')

const loadStub = (stubData) => {
    return spyOn(load, 'JSONfromExternalFile').and.callFake((data) => {
        let response = {getResponseHeader: () => 'fakeEtagValue'}
        if (data.match('entitylist')) {
            return Promise.resolve(Object.assign(response, {status: 200, data: stubData.entityList}))
        } else {
            return Promise.reject(new Error('load error'))
        }
    })
}

module.exports = {
    loadStub
}
