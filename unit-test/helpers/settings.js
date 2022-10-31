/**
 * Replaces settings with a very simple object-based stub
 *
 * Because this is a Jasmine spy, it resets after every test case,
 * so make sure to have it within a it() or beforeEach()/beforeAll()
 */
import * as origSettings from '../../shared/js/background/settings'

export const stub = (startingVals) => {
    const settingObj = startingVals || {}

    const get = spyOn(origSettings, 'getSetting')
        .and.callFake(key => settingObj[key])

    const update = spyOn(origSettings, 'updateSetting')
        .and.callFake((key, val) => { settingObj[key] = val })

    const remove = spyOn(origSettings, 'removeSetting')
        .and.callFake(key => { delete settingObj[key] })

    const ready = spyOn(origSettings, 'ready')
        .and.callFake(() => Promise.resolve())

    return { get, update, remove, ready }
}
