/**
 * @typedef {import('../settings.js')} Settings
 * @typedef {import('./tds').default} TDSStorage
 * @typedef {import('@duckduckgo/privacy-configuration/schema/config.ts').GenericV4Config} Config
 * @typedef {{
 *  localeCountry: string;
 *  localeLanguage: string;
 * }} TargetEnvironment
 */

import { getUserLocaleCountry, getUserLocale } from '../i18n';
import { getFeatureSettings, isFeatureEnabled, satisfiesMinVersion } from '../utils';
import { getExtensionVersion, getFromSessionStorage } from '../wrapper';
import ResourceLoader from './resource-loader';
import constants from '../../../data/constants';

/**
 * @returns {Promise<string>}
 */
async function getConfigUrl() {
    const override = await getFromSessionStorage('configURLOverride');
    if (override) {
        return override;
    }
    return constants.tdsLists[2].url;
}

export default class RemoteConfig extends ResourceLoader {
    /**
     * @param {{
     *  settings: Settings
     * }} opts
     */
    constructor({ settings }) {
        super(
            {
                name: 'config',
                remoteUrl: getConfigUrl,
                localUrl: '/data/bundled/extension-config.json',
                updateIntervalMinutes: 15,
            },
            { settings },
        );
        /** @type {Config?} */
        this.config = null;
        this.settings = settings;
        this.onUpdate(async (_, etag, v) => {
            this.updateConfig(v);
        });
        /** @type {TargetEnvironment} */
        this.targetEnvironment = {
            localeCountry: getUserLocaleCountry(),
            localeLanguage: getUserLocale(),
        };
    }

    /**
     *
     * @param {Config} configValue
     */
    updateConfig(configValue) {
        // copy config value before modification
        const configCopy = structuredClone(configValue);
        this.config = this._processRawConfig(configCopy);
    }

    /**
     *
     * @param {string} featureName
     * @returns {boolean}
     */
    isFeatureEnabled(featureName) {
        return isFeatureEnabled(featureName, this.config || undefined);
    }

    /**
     *
     * @param {string} featureName
     * @returns {object}
     */
    getFeatureSettings(featureName) {
        return getFeatureSettings(featureName, this.config || undefined);
    }

    isSubFeatureEnabled(featureName, subFeatureName) {
        if (this.config) {
            return isSubFeatureEnabled(featureName, subFeatureName, this.config);
        } else {
            return false;
        }
    }

    /**
     * Get the user's assigned cohort for this feature and subfeature
     * @param {string} featureName
     * @param {string} subFeatureName
     * @returns {string | null} Cohort name, or null if no cohort has been assigned.
     */
    getCohort(featureName, subFeatureName) {
        return this.settings.getSetting(`abn.${featureName}.${subFeatureName}.cohort`);
    }

    /**
     * Process config to apply rollout, targets and cohorts options to derive sub-feature enabled state.
     * @param {Config} configValue
     * @returns {Config}
     */
    _processRawConfig(configValue) {
        Object.entries(configValue.features).forEach(([featureName, feature]) => {
            Object.entries(feature.features || {}).forEach(([name, subfeature]) => {
                if (subfeature.targets && subfeature.state === 'enabled') {
                    // Targets: subfeature should only be enabled if a matching target is found.
                    const match = subfeature.targets.some((t) => Object.entries(t).every(([k, v]) => v === this.targetEnvironment[k]));
                    if (!match) {
                        subfeature.state = 'disabled';
                    }
                }
                if (subfeature.rollout && subfeature.state === 'enabled') {
                    /* Handle a rollout: Dice roll is stored in settings and used that to decide
                     * whether the feature is set as 'enabled' or not.
                     */
                    const rolloutSettingsKey = `rollouts.${featureName}.${name}.roll`;
                    const validSteps = subfeature.rollout.steps.filter((v) => v.percent > 0 && v.percent <= 100);
                    const rolloutPercent = validSteps.length > 0 ? validSteps.reverse()[0].percent : 0.0;
                    if (!this.settings.getSetting(rolloutSettingsKey)) {
                        this.settings.updateSetting(rolloutSettingsKey, Math.random() * 100);
                    }
                    const dieRoll = this.settings.getSetting(rolloutSettingsKey);
                    subfeature.state = rolloutPercent >= dieRoll ? 'enabled' : 'disabled';
                }
                if (subfeature.cohorts && subfeature.state === 'enabled') {
                    /* Handle an ABN experiment: Experiment assignment is stored in settings */
                    const assignedCohortSettingsKey = `abn.${featureName}.${name}.cohort`;
                    const assignedCohort = this.settings.getSetting(assignedCohortSettingsKey);
                    if (!assignedCohort) {
                        const cohorts = subfeature.cohorts.filter((c) => c.weight > 0);
                        const cohortWeightSum = cohorts.reduce((sum, c) => sum + c.weight, 0);
                        const diceRoll = Math.random() * cohortWeightSum;
                        let rollingTotal = 0;
                        const chosen = cohorts.find((c) => {
                            rollingTotal = rollingTotal + c.weight;
                            return diceRoll <= rollingTotal;
                        });
                        this.settings.updateSetting(assignedCohortSettingsKey, chosen?.name);
                    }
                }
            });
        });
        return configValue;
    }
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
        return false;
    }
    if (subFeature.minSupportedVersion) {
        const extensionVersionString = getExtensionVersion();
        if (!satisfiesMinVersion(subFeature.minSupportedVersion, extensionVersionString)) {
            return false;
        }
    }
    return subFeature.state === 'enabled';
}
