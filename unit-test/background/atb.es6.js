const atb = require('../../shared/js/background/atb.es6')
const settings = require('../../shared/js/background/settings.es6')

const canShowAtbCases = [
    {
        "domain": "duckduckgo.com/software",
        "result": false
    }, {
        "domain": "duckduckgo.com/app",
        "result": false
    }, {
        "domain": "duckduckgo.com/about",
        "result": true
    }, {
        "domain": "duckduckgo.com",
        "result": true
    }
]

describe('atb.canShowPostInstall()', () => {
    canShowAtbCases.forEach((test) => {
        it(`should return ${test.result} when the domain is: '${test.domain}'`, () => {

            // ensure settings.getSettings('hasSeenPostInstall') == false
            spyOn(settings, 'getSetting').and.returnValue(false);

            const result = atb.canShowPostInstall(test.domain);
            expect(result).toBe(test.result)
        })
    })
});
