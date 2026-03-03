/**
 * Example extension feature demonstrating ConfigFeature usage in the extension background.
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
const DEFAULT_MAX_ITEMS = 10;

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
     * Returns the configured maxItems limit.
     * If the user is in the 'treatment' cohort of the 'newLimit' experiment,
     * conditionalChanges patches maxItems to 50 via ConfigFeature.getFeatureSetting.
     * @returns {number}
     */
    get maxItems() {
        // @ts-ignore - inherited from ConfigFeature (maxNodeModuleJsDepth prevents TS resolution)
        return this.getFeatureSetting('maxItems') ?? DEFAULT_MAX_ITEMS;
    }
}
