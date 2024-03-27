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
        this.tds = new ResourceLoader({
            name: 'tds',
            remoteUrl: constants.tdsLists[1].url,
            updateIntervalMinutes: 15
        }, { settings })
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
    }

    ready () {
        return Promise.all([
            this.tds.ready,
            this.surrogates.ready,
            this.config.ready
        ])
    }
}
