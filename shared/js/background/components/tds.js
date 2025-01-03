import ResourceLoader from './resource-loader.js';
import constants from '../../../data/constants';

/**
 * @typedef {import('../settings.js')} Settings
 * @typedef {import('./remote-config.js').default} RemoteConfig
 */

export default class TDSStorage {
    /**
     * @param {{
     *  settings: Settings,
     *  config: RemoteConfig
     * }} opts
     */
    constructor({ settings, config }) {
        this.config = config;
        this.surrogates = new ResourceLoader(
            {
                name: 'surrogates',
                localUrl: '/data/surrogates.txt',
                format: 'text',
            },
            { settings },
        );
        this.tds = new ResourceLoader(
            {
                name: 'tds',
                remoteUrl: constants.tdsLists[1].url,
                updateIntervalMinutes: 15,
            },
            { settings },
        );
    }

    ready() {
        return Promise.all([this.tds.ready, this.surrogates.ready, this.config.ready]);
    }
}
