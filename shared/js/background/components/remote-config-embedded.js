/**
 * RemoteConfigEmbedded - Config management for embedded extension
 *
 * This version:
 * - Loads initial bundled config
 * - Receives updates from native app via NativeResourceLoader
 * - Removes cohort/rollout/experiment handling (managed by native app)
 * - Provides config parsing for feature enabled checks
 */

/**
 * @typedef {import('./remote-config').Config} Config
 * @typedef {import('./remote-config').default} RemoteConfigInterface
 * @typedef {import('./native-messaging.js').NativeMessaging} NativeMessaging
 */

import { getFeatureSettings, isFeatureEnabled } from '../utils';
// TODO: FIXME: THIS IS ONLY ADDED FOR TESTING, REMOVE BEFORE MERGING
import bundledConfig from '../../../data/bundled/macos-config.json';
import { isSubFeatureEnabled } from './remote-config';
import NativeResourceLoader from './native-resource-loader.js';

/**
 * @implements {RemoteConfigInterface}
 * Embedded version of RemoteConfig that receives config from native app.
 * Provides the same public API as RemoteConfig for feature/subfeature checks.
 */
export default class RemoteConfigEmbedded extends NativeResourceLoader {
    /**
     * @param {{
     *  nativeMessaging: NativeMessaging
     * }} opts
     */
    constructor(opts) {
        super(
            {
                name: 'config',
                initialData: bundledConfig,
                updateIntervalMinutes: 15, // note that we _also_ check on every service worker "wake"
            },
            {
                nativeMessaging: opts.nativeMessaging,
            },
        );

        /** @type {Config | null} */
        this.config = null;

        // the embedded version no-ops these entries for now
        this.settings = null;
        this.targetEnvironment = null;

        // Process config when data is loaded/updated
        this.onUpdate(this._updateCallback.bind(this));
    }

    /**
     * Process and store the config data
     * @param {Config} configValue
     * @param {string} etag
     * @param {Config} configValue
     */
    _updateCallback(name, etag, configValue) {
        // Clone to avoid mutations affecting the original
        const configCopy = structuredClone(configValue);
        this.config = configCopy;
        console.log('RemoteConfigEmbedded: Config processed', this.config);
    }

    /**
     * Check if a feature is enabled
     * @param {string} featureName
     * @returns {boolean}
     */
    isFeatureEnabled(featureName) {
        return isFeatureEnabled(featureName, this.config || structuredClone(bundledConfig));
    }

    /**
     * Get feature settings
     * @param {string} featureName
     * @returns {object}
     */
    getFeatureSettings(featureName) {
        return getFeatureSettings(featureName, this.config || structuredClone(bundledConfig));
    }

    /**
     * Check if a sub-feature is enabled
     * @param {string} featureName
     * @param {string} subFeatureName
     * @returns {boolean}
     */
    isSubFeatureEnabled(featureName, subFeatureName) {
        if (!this.config) {
            return false;
        }
        return isSubFeatureEnabled(featureName, subFeatureName, this.config);
    }

    /**
     * Get sub-feature names for a feature
     * @param {string} featureName
     * @returns {string[]}
     */
    getSubFeatureNames(featureName) {
        if (!this.config || !this.config.features[featureName]) {
            return [];
        }
        return Object.keys(this.config.features[featureName].features || {});
    }

    /**
     * Get statuses of all sub-features (for debugging)
     * @returns {import('./remote-config').SubFeatureStatus[]}
     */
    getSubFeatureStatuses() {
        /** @type {import('./remote-config').SubFeatureStatus[]} */
        const statuses = [];
        if (!this.config) {
            return statuses;
        }
        Object.entries(this.config.features).forEach(([featureName, feature]) => {
            Object.entries(feature.features || {}).forEach(([name, subfeature]) => {
                statuses.push({
                    feature: featureName,
                    subFeature: name,
                    state: subfeature.state,
                    hasTargets: !!subfeature.targets,
                    // values below are stubbed in the embedded version (cohorts/rollouts are handled by native app)
                    hasRollout: false,
                    rolloutRoll: null,
                    rolloutPercent: null,
                    hasCohorts: false,
                    cohort: null,
                    availableCohorts: undefined,
                });
            });
        });
        return statuses;
    }

    /**
     * no-op in the embedded extension (cohorts managed by native)
     * @returns {null}
     */
    getCohort() {
        return null;
    }

    /**
     * no-op in the embedded extension (cohorts managed by native)
     * @returns {null}
     */
    getCohortName() {
        return null;
    }

    /**
     * no-op in the embedded extension (cohorts managed by native)
     */
    setCohort() { }
}
