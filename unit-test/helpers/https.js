// stub out https list loading
const load = require('../../shared/js/background/load');

const loadStub = (stubData) => {
    return spyOn(load, 'loadExtensionFile').and.callFake((data) => {
        const response = { getResponseHeader: () => 'fakeEtagValue' };
        if (data.url.match('/https-bloom.json')) {
            return Promise.resolve(Object.assign(response, { status: 200, data: stubData.httpsBloom }));
        } else if (data.url.match('/https-allowlist.json')) {
            return Promise.resolve(Object.assign(response, { status: 200, data: stubData.httpsAllowlist }));
        } else if (data.url.match('/negative-https-bloom.json')) {
            return Promise.resolve(Object.assign(response, { status: 200, data: stubData.httpsNegativeBloom }));
        } else if (data.url.match('/negative-https-allowlist.json')) {
            return Promise.resolve(Object.assign(response, { status: 200, data: stubData.httpsNegativeAllowlist }));
        } else {
            return Promise.reject(new Error('load error'));
        }
    });
};

module.exports = {
    loadStub,
};
