import tdsStorage from '../storage/tds'
import trackers from '../trackers'

class TDS {
    constructor () {
        this._loadPromise = Promise.all([this._loadTds(), this._loadConfig(), this._loadSurrogates()])
        tdsStorage.ready = this.ready.bind(this)
        this._loadPromise.then(() => {
            trackers.setLists([{
                name: 'surrogates',
                data: this.surrogates
            }, {
                name: 'tds',
                data: this.tds
            }, {
                name: 'config',
                data: this.config
            }])
        })
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

    async _loadSurrogates () {
        this.surrogates = await (await fetch('/data/surrogates.txt')).text()
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
