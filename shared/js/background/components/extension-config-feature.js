/**
 * Base class for extension background features that leverage C-S-S's ConfigFeature
 * for experiment-aware config processing.
 *
 * This enables extension features to use the same conditional config pipeline as
 * C-S-S injected features: domain matching, experiment matching, version checks, etc.
 *
 * Experiments defined under `contentScopeExperiments` in remote config work identically
 * to how they work inside C-S-S: currentCohorts are matched via _matchExperimentConditional,
 * and conditionalChanges with experiment conditions are applied via getFeatureSetting.
 */
import { ConfigFeature } from '@duckduckgo/content-scope-scripts/configuration/index.js';
import { buildConfigFeatureArgs, getExtensionPlatform, parseFeatureSettings } from '../helpers/css-config';
import tdsStorage from '../storage/tds';

export { ConfigFeature };

export default class ExtensionConfigFeature extends ConfigFeature {
    /** @type {import('./remote-config').default} */
    #remoteConfig;

    /** @type {import('./abn-experiments').default | null} */
    #abnMetrics;

    /**
     * @param {string} featureName - Name matching a key in remote config `features`
     * @param {{
     *   remoteConfig: import('./remote-config').default,
     *   abnMetrics?: import('./abn-experiments').default | null,
     * }} opts
     */
    constructor(featureName, { remoteConfig, abnMetrics }) {
        const args = ExtensionConfigFeature.#buildArgs(remoteConfig, abnMetrics);
        super(featureName, args);
        this.#remoteConfig = remoteConfig;
        this.#abnMetrics = abnMetrics || null;

        remoteConfig.onUpdate(() => {
            this.#refreshArgs();
        });
    }

    /**
     * @param {import('./remote-config').default} remoteConfig
     * @param {import('./abn-experiments').default | null | undefined} abnMetrics
     * @returns {import('@duckduckgo/content-scope-scripts/configuration/index.js').LoadArgs}
     */
    static #buildArgs(remoteConfig, abnMetrics) {
        const config = remoteConfig.config || tdsStorage.config;
        const platform = getExtensionPlatform();
        const featureSettings = config ? parseFeatureSettings(config, Object.keys(config.features || {})) : {};
        const currentCohorts = abnMetrics?.getCurrentCohorts()?.filter((c) => c.cohort != null) || [];

        return {
            site: {
                domain: null,
                url: null,
                isBroken: false,
                allowlisted: false,
                enabledFeatures: Object.keys(config?.features || {}),
            },
            platform,
            bundledConfig: config || undefined,
            featureSettings,
            currentCohorts,
            messagingContextName: 'contentScopeScripts',
            debug: false,
        };
    }

    /**
     * Rebuild args from current config and cohort state.
     * Called automatically when remote config is updated.
     */
    #refreshArgs() {
        this.args = ExtensionConfigFeature.#buildArgs(this.#remoteConfig, this.#abnMetrics);
    }

    /**
     * Rebuild args scoped to a specific tab/URL for per-site config lookups.
     * Use this when you need domain-specific conditional settings.
     *
     * @param {{
     *  url: string,
     *  domain: string,
     *  enabledFeatures?: string[],
     *  isBroken?: boolean,
     *  allowlisted?: boolean,
     * }} siteInfo
     */
    setCurrentSite(siteInfo) {
        const currentCohorts = this.#abnMetrics?.getCurrentCohorts()?.filter((c) => c.cohort != null) || [];
        this.args = buildConfigFeatureArgs({
            ...siteInfo,
            currentCohorts,
        });
    }

    /**
     * Check if this feature is enabled in the remote config.
     * @returns {boolean}
     */
    get enabled() {
        // @ts-ignore - this.name is inherited from ConfigFeature (maxNodeModuleJsDepth prevents TS resolution)
        return this.#remoteConfig.isFeatureEnabled(this.name);
    }

    /**
     * Get the current experiment cohorts relevant to this feature.
     * These are the same cohorts that flow into C-S-S and breakage reports.
     * @returns {Record<string, string>}
     */
    getActiveExperiments() {
        const cohorts = this.#abnMetrics?.getCurrentCohorts() || [];
        /** @type {Record<string, string>} */
        const experiments = {};
        for (const cohort of cohorts) {
            if (cohort.cohort) {
                experiments[cohort.subfeature] = cohort.cohort;
            }
        }
        return experiments;
    }
}
