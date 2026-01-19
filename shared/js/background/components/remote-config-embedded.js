/**
 * RemoteConfigEmbedded - Simplified config management for embedded extension
 *
 * This version:
 * - Only loads bundled config (no remote fetching)
 * - Removes cohort/rollout/experiment handling (will be managed by native app later)
 * - Provides config parsing for feature enabled checks
 */

/**
 * @typedef {import('./remote-config').Config} Config
 * @typedef {import('./remote-config').default} RemoteConfigInterface
 */

import { getFeatureSettings, isFeatureEnabled } from '../utils';
import bundledConfig from '../../../data/bundled/extension-config.json';
import { isSubFeatureEnabled } from './remote-config';

/**
 * @implements {RemoteConfigInterface}
 */
export default class RemoteConfigEmbedded extends EventTarget {
    /**
     * @param {object} opts
     */
    constructor(opts) {
        super();
        /** @type {Config | null} */
        this.config = null;

        // Load bundled config immediately
        this.ready = this._loadBundledConfig();

        // the embedded version no-ops these entries for now
        this.settings = null;
        this.targetEnvironment = null;
        /** @type {import('./resource-loader').ResourceName} */
        this.name = 'config';
        this.remoteUrl = null;
        this.localUrl = null;
        this.updateIntervalMinutes = 0;
        this.format = 'json';
        this.data = null;
        this._onUpdateProcessing = [];
        this.lastUpdate = 0;
        this.etag = '';
        this.allLoadingFinished = this.ready;
    }

    /**
     * Load config from bundled data
     * @returns {Promise<void>}
     */
    async _loadBundledConfig() {
        console.log('RemoteConfigEmbedded: Loading bundled config');

        // Clone to avoid mutations affecting the original
        const configCopy = structuredClone(bundledConfig);
        this.config = configCopy;
        this._emitUpdate();

        console.log('RemoteConfigEmbedded: Config loaded', this.config);
    }

    /**
     * Allow native app to provide config updates
     * @param {Config} configValue
     */
    updateConfig(configValue) {
        const configCopy = structuredClone(configValue);
        this.config = configCopy;
        this._emitUpdate();
    }

    /**
     * @private
     */
    _emitUpdate() {
        this.dispatchEvent(
            new CustomEvent('update', {
                detail: {
                    name: 'config',
                    version: this.config.version,
                    data: this.config,
                },
            }),
        );
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
                    // values below are stubbed in the embedded version
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
     * Register callback for config updates
     * @param {import('./resource-loader').OnUpdatedCallback} cb
     */
    onUpdate(cb) {
        this.addEventListener('update', (ev) => {
            if (ev instanceof CustomEvent) {
                const { name, version, data } = ev.detail;
                cb(name, version, data);
            }
        });
    }

    /**
     * no-op in the embedded extension
     */
    getCohort() {
        return null;
    }

    /**
     *no-op in the embedded extension
     */
    getCohortName() {
        return null;
    }

    /**
     * no-op in the embedded extension
     */
    setCohort() {
    }

    /**
     * no-op in the embedded extension
     */
    _processRawConfig() {
    }

    /**
     * no-op in the embedded extension
     * @returns {Promise<void>}
     */
    async checkForUpdates() {
    }

    /**
     * no-op in the embedded extension
     */
    async _loadFromDB() {
        return { contents: null };
    }

    /**
     * no-op in the embedded extension
     */
    async _loadFromURL() {
        return { contents: null };
    }

    /**
     * no-op in the embedded extension
     */
    async _getDb() {
        return null;
    }

    /**
     * no-op in the embedded extension
     */
    async _updateData() {
    }

    /**
     * no-op in the embedded extension
     */
    async overrideDataValue() {
    }

    /**
     * no-op in the embedded extension
     */
    async modify() {
    }
}
