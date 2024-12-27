
/**
 * @typedef {import('../settings.js')} Settings
 * @typedef {import('./tds').default} TDSStorage
 * @typedef {import('@duckduckgo/privacy-configuration/schema/config.js').GenericV4Config} Config
 */

import { getFeatureSettings, isFeatureEnabled, satisfiesMinVersion } from '../utils'
import { getExtensionVersion } from '../wrapper'

export default class RemoteConfig {
    /**
     * @param {{
     * tds: TDSStorage
     *  settings: Settings
     * }} opts
     */
    constructor({ tds, settings }) {
        /** @type {Config?} */
        this.config = null
        this.settings = settings
        this.ready = new Promise((resolve) => {
            tds.config.onUpdate(async (_, etag, v) => {
                await this.settings.ready()
                this.config = processRawConfig(v)
                resolve(null)
            })
        })
    }

    /**
     * 
     * @param {string} featureName 
     * @returns {boolean}
     */
    isFeatureEnabled(featureName) {
        return isFeatureEnabled(featureName, this.config || undefined)
    }

    /**
     * 
     * @param {string} featureName 
     * @returns {object}
     */
    getFeatureSettings(featureName) {
        return getFeatureSettings(featureName, this.config || undefined)
    }

    isSubFeatureEnabled(featureName, subFeatureName) {
        if (this.config) {
            return isSubFeatureEnabled(featureName, subFeatureName, this.config)
        } else {
            return false
        }
    }
}

/**
 * 
 * @param {Config} configValue 
 * @returns {Config}
 */
function processRawConfig(configValue) {
    return configValue
}

/**
 * 
 * @param {string} featureName 
 * @param {string} subFeatureName 
 * @param {Config} config
 * @returns {boolean}
 */
function isSubFeatureEnabled(featureName, subFeatureName, config) {
    const feature = config.features[featureName];
    const subFeature = (feature?.features || {})[subFeatureName];
    if (!feature || !subFeature) {
        return false
    }
    if (subFeature?.minSupportedVersion) {
        const extensionVersionString = getExtensionVersion();
        if (!satisfiesMinVersion(subFeature.minSupportedVersion, extensionVersionString)) {
            return false;
        }
    }
    return subFeature?.state === 'enabled';
}
