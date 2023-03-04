import tdsStorage from '../storage/tds'

class TDS {
    constructor () {
        this._loadPromise = Promise.all([this._loadTds(), this._loadConfig()])
        tdsStorage.ready = this.ready.bind(this)
    }

    async _loadTds () {
        this.tds = await (await fetch('/data/bundled/tds.json')).json()
        // for compat with static imports, attach to tdsStorage singleton
        tdsStorage.tds = this.tds
    }

    async _loadConfig () {
        this.config = await (await fetch('/data/bundled/extension-config.json')).json()
        tdsStorage.config = this.config
    }

    ready () {
        return this._loadPromise
    }
}

export default {
    init: async () => {
        const tds = new TDS()
        await tds.ready()
        return tds
    },
    onInstalled: () => {

    }
}
