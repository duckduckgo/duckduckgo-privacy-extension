import tdsStorage from '../storage/tds'
import trackers from '../trackers'
import { tdsLists } from '../../../data/constants'

const bundledConfig = {
    url: '/data/bundled/extension-config.json'
}
const configList = tdsLists.find(l => l.name === 'config') || bundledConfig

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
        let response
        console.log('fetch', configList.url)
        response = await fetch(configList.url)
        if (!response.ok) {
            console.warn('Config fetch error', response)
            response = await fetch(bundledConfig.url)
        }
        this.config = await response.json()
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
