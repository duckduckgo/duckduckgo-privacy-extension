import RemoteConfig from '../../shared/js/background/components/remote-config';
import TDSStorage from '../../shared/js/background/components/tds';

export class MockSettings {
    constructor() {
        this.mockSettingData = new Map();
        this.ready = () => Promise.resolve();
    }

    getSetting(key) {
        return structuredClone(this.mockSettingData.get(key));
    }
    updateSetting(key, value) {
        this.mockSettingData.set(key, value);
    }
    removeSetting(name) {
        this.mockSettingData.delete(name);
    }
    clearSettings() {
        this.mockSettingData.clear();
    }
}

export function mockTdsStorage(settings) {
    // delay settings ready until we have fetch mocking in place
    let settingsResolve = null;
    const settingsReadyPromise = new Promise((resolve) => {
        settingsResolve = resolve;
    });
    settings.ready = () => settingsReadyPromise;
    const etags = require('../../shared/data/etags.json');
    const remoteConfig = new RemoteConfig({ settings });
    remoteConfig._loadFromURL = () =>
        Promise.resolve({
            contents: require('./../data/extension-config.json'),
            etag: etags['config-etag'],
        });
    const tds = new TDSStorage({ settings, remoteConfig });
    tds.tds._loadFromURL = () =>
        Promise.resolve({
            contents: require('./../data/tds.json'),
            etag: etags['current-mv3-tds-etag'],
        });
    tds.surrogates._loadFromURL = () =>
        Promise.resolve({
            contents: require('./../data/surrogates.js').surrogates,
            etag: 'surrogates',
        });
    settingsResolve();
    return tds;
}
