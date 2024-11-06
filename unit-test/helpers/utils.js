// stub out util entitylist list loading
const load = require('../../shared/js/background/load');

const loadStub = (stubData) => {
    return spyOn(load, 'loadExtensionFile').and.callFake((data) => {
        const response = { getResponseHeader: () => Math.floor(Math.random() * Math.floor(10)) };
        if (data.url.match('tds')) {
            return Promise.resolve(Object.assign(response, { status: 200, data: stubData.tds }));
        } else if (data.url.match('surrogates')) {
            return Promise.resolve(Object.assign(response, { status: 200, data: stubData.surrogates }));
        } else if (data.url.match('extension-config')) {
            return Promise.resolve(Object.assign(response, { status: 200, data: stubData.config }));
        } else {
            return Promise.reject(new Error('load error'));
        }
    });
};

module.exports = {
    loadStub,
};
