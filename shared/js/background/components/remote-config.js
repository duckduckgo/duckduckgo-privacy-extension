
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
     *  tds?: TDSStorage
     *  settings: Settings
     * }} opts
     */
    constructor({ tds, settings }) {
        /** @type {Config?} */
        this.config = null
        this.settings = settings
        this.ready = new Promise((resolve) => {
            tds?.config.onUpdate(async (_, etag, v) => {
                this.updateConfig(v)
                resolve(null)
            })
        })
    }

    /**
     * 
     * @param {Config} configValue 
     */
    updateConfig(configValue) {
        this.config = processRawConfig(configValue, this.settings)
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
 * @param {Settings} settings
 * @returns {Config}
 */
export function processRawConfig(configValue, settings) {
    Object.values(configValue.features).forEach((feature) => {
        Object.entries(feature.features || {}).forEach(([name, subfeature]) => {
            if (subfeature.rollout && subfeature.state === 'enabled') {
                const rolloutSettingsKey = `rollouts.${name}.roll`
                const validSteps = subfeature.rollout.steps.filter((v) => v.percent > 0 && v.percent <= 100)
                const rolloutPercent = validSteps.length > 0 ? validSteps.reverse()[0].percent : 0.0
                const dieRoll = parseFloat(settings.getSetting(rolloutSettingsKey)) || Math.random() * 100
                subfeature.state = rolloutPercent > dieRoll ? 'enabled' : 'disabled'
                settings.updateSetting(rolloutSettingsKey, dieRoll)
            }
        })
    })
    return configValue
}

/**
 * 
 * @param {string} featureName 
 * @param {string} subFeatureName 
 * @param {Config} config
 * @returns {boolean}
 */
export function isSubFeatureEnabled(featureName, subFeatureName, config) {
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
