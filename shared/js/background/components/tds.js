import ResourceLoader from './resource-loader.js'
import constants from '../../../data/constants'
import { getFromSessionStorage } from '../wrapper.js'

/**
 * @typedef {import('../settings.js')} Settings
 */

/**
 * @returns {Promise<string>}
 */
async function getConfigUrl () {
    const override = await getFromSessionStorage('configURLOverride')
    if (override) {
        return override
    }
    return constants.tdsLists[2].url
}

export default class TDSStorage {
    /**
     * @param {{
    *  settings: Settings
    * }} opts
    */
    constructor ({ settings }) {
        this.surrogates = new ResourceLoader({
            name: 'surrogates',
            localUrl: '/data/surrogates.txt',
            format: 'text'
        }, { settings })
        this.config = new ResourceLoader({
            name: 'config',
            remoteUrl: getConfigUrl,
            localUrl: '/data/bundled/extension-config.json',
            updateIntervalMinutes: 15
        }, { settings })
        this.tds = new ResourceLoader({
            name: 'tds',
            remoteUrl: this.getTDSUrl.bind(this),
            updateIntervalMinutes: 15
        }, { settings })

        // trigger TDS fetch if the config changes the TDS URL
        this.config.onUpdate(async () => {
            if (await this.getTDSUrl() !== constants.tdsLists[1].url) {
                console.log('refetch TDS')
                this.tds.checkForUpdates(true)
            }
        })
    }

    ready () {
        return Promise.all([
            this.tds.ready,
            this.surrogates.ready,
            this.config.ready
        ])
    }

    async getTDSUrl () {
        await this.config.ready
        const tdsConfig = this.config.data.features.tds
        console.log('checking TDS URL from config', tdsConfig)
        if (tdsConfig && tdsConfig.settings.overridePath) {
            return `https://staticcdn.duckduckgo.com/trackerblocking/${tdsConfig.settings.overridePath}`
        }
        return constants.tdsLists[1].url
    }
}
