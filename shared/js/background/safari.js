import * as settings from './settings'

(async () => {
    await settings.ready()
})()

globalThis.dbg = {
    settings,
}
