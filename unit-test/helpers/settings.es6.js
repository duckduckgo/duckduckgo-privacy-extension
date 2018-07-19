/**
 * Replaces settings with a very simple object-based stub
 *
 * Because this is a Jasmine spy, it resets after every test case,
 * so make sure to have it within a it() or beforeEach()/beforeAll()
 */
const origSettings = require('../../shared/js/background/settings.es6')

const stub = (startingVals) => {
    let settingObj = startingVals || {}

    let get = spyOn(origSettings, 'getSetting')
        .and.callFake(key => settingObj[key])

    let update = spyOn(origSettings, 'updateSetting')
        .and.callFake((key, val) => { settingObj[key] = val })

    let remove = spyOn(origSettings, 'removeSetting')
        .and.callFake(key => { delete settingObj[key] })

    let ready = spyOn(origSettings, 'ready')
        .and.callFake(() => Promise.resolve())

    return { get, update, remove, ready }
}

module.exports = {
    stub
}
