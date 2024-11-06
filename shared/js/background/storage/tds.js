const settings = require('../settings');

/**
 * @typedef {import('../components/tds').default} TDSStorage
 */

/** @type {import('../components/resource-loader').ResourceName[]} */
const listNames = ['tds', 'surrogates', 'config'];

/**
 * This object emulates the legacy tdsStorage global class, deligating calls to 3 instances of
 * ResourceLoader (for tds, surrogates and config respectively), defined in background.js
 */
export default {
    _config: { features: {} },
    _tds: { entities: {}, trackers: {}, domains: {}, cnames: {} },
    _surrogates: '',
    get config() {
        return globalThis.components?.tds.config.data || this._config;
    },
    get tds() {
        return globalThis.components?.tds.tds.data || this._tds;
    },
    get surrogates() {
        return globalThis.components?.tds.surrogates.data || this._surrogates;
    },
    // these setters are to allow legacy tests to override the values here. In a running extension
    // these will have no effect
    set config(fallbackValue) {
        this._config = fallbackValue;
    },
    set tds(fallbackValue) {
        this._tds = fallbackValue;
    },
    set surrogates(fallbackValue) {
        this._surrogates = fallbackValue;
    },
    /** @type {TDSStorage?} */
    get tdsStorage() {
        return globalThis.components?.tds;
    },
    /**
     * @param {import('../components/resource-loader').ResourceName} configName
     * @param {import('../components/resource-loader').OnUpdatedCallback} cb
     */
    async onUpdate(configName, cb) {
        await settings.ready();
        if (listNames.includes(configName) && this.tdsStorage && this.tdsStorage[configName]) {
            this.tdsStorage[configName].onUpdate(cb);
        }
    },
    /**
     * @param {import('../components/resource-loader').ResourceName} [configName]
     * @returns {Promise}
     */
    async ready(configName) {
        await settings.ready();
        const tdsStorage = this.tdsStorage;
        if (!tdsStorage) {
            return Promise.resolve();
        }
        if (configName && listNames.includes(configName)) {
            return tdsStorage[configName].ready;
        }
        return Promise.all(listNames.map((n) => tdsStorage[n].ready));
    },
    getSerializableList(name) {
        // TODO: This should be moved to a 'devtools' component
        if (name === 'tds') {
            const tds = globalThis.components.tds.tds;
            // copy and convert regexes to string
            const listCopy = JSON.parse(JSON.stringify(tds.data));
            Object.values(listCopy.trackers).forEach((tracker) => {
                tracker.rules?.forEach((rule, i) => {
                    // convert Regex to string and cut slashes and flags
                    const ruleRegexStr = tds.data.trackers[tracker.domain].rules[i].rule.toString();
                    rule.rule = ruleRegexStr.slice(1, ruleRegexStr.length - 3);
                });
            });
            return listCopy;
        } else if (['surrogates', 'config'].includes(name)) {
            return globalThis.components.tds[name].data;
        }
    },
    async getLists() {
        await this.ready();
        return [
            {
                name: 'tds',
                data: this.tds,
            },
            {
                name: 'config',
                data: this.config,
            },
            {
                name: 'surrogates',
                data: this.surrogates,
            },
        ];
    },
};
