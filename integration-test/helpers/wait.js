/* global dbg:false */
const ms = async (ms) => {
    await new Promise((resolve) => { setTimeout(resolve, ms) })
}

const forSetting = async (bgPage, key) => {
    await bgPage.waitForFunction((key) => {
        if (!window.dbg) return

        return dbg.settings.getSetting(key)
    }, { polling: 100 }, key)
}

module.exports = {
    ms,
    forSetting
}
