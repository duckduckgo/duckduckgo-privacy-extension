/**
 * Example extension feature demonstrating ConfigFeature usage in the extension background.
 *
 * This shows how to:
 * 1. Extend ExtensionConfigFeature to get C-S-S experiment-aware config processing
 * 2. Read feature settings with conditional overrides (per-domain, per-experiment)
 * 3. Access current experiment cohorts for feature-gating
 * 4. Respond to config updates
 *
 * The feature name ('exampleExtensionFeature') must match a key in remote config `features`.
 * Experiment conditionals work identically to C-S-S: define cohorts under
 * `contentScopeExperiments` and use `conditionalChanges` with `experiment` conditions
 * in this feature's settings.
 *
 * Example remote config:
 * ```json
 * {
 *   "features": {
 *     "exampleExtensionFeature": {
 *       "state": "enabled",
 *       "settings": {
 *         "maxItems": 10,
 *         "conditionalChanges": [
 *           {
 *             "condition": {
 *               "experiment": { "experimentName": "newLimit", "cohort": "treatment" }
 *             },
 *             "patchSettings": [
 *               { "op": "replace", "path": "/maxItems", "value": 50 }
 *             ]
 *           }
 *         ]
 *       }
 *     },
 *     "contentScopeExperiments": {
 *       "state": "enabled",
 *       "features": {
 *         "newLimit": {
 *           "state": "enabled",
 *           "cohorts": [
 *             { "name": "control", "weight": 1 },
 *             { "name": "treatment", "weight": 1 }
 *           ]
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 */
import ExtensionConfigFeature from './extension-config-feature';

const FEATURE_NAME = 'exampleExtensionFeature';

export default class ExampleExtensionFeature extends ExtensionConfigFeature {
    /**
     * @param {{
     *   remoteConfig: import('./remote-config').default,
     *   abnMetrics?: import('./abn-experiments').default | null,
     * }} opts
     */
    constructor(opts) {
        super(FEATURE_NAME, opts);
    }

    /**
     * Read a setting with full conditional config support (domain, experiment, version).
     * If the user is in a matching experiment cohort, conditionalChanges are applied.
     *
     * @param {string} key
     * @returns {any}
     */
    getSetting(key) {
        // @ts-ignore - inherited from ConfigFeature (maxNodeModuleJsDepth prevents TS resolution)
        return this.getFeatureSetting(key);
    }

    /**
     * Check if a boolean setting is enabled (supports 'enabled'/'disabled'/'internal'/'preview' states).
     * @param {string} key
     * @returns {boolean}
     */
    isSettingEnabled(key) {
        // @ts-ignore - inherited from ConfigFeature (maxNodeModuleJsDepth prevents TS resolution)
        return this.getFeatureSettingEnabled(key);
    }
}
