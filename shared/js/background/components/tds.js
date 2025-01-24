import ResourceLoader from './resource-loader.js';
import constants from '../../../data/constants';
import { generateRetentionMetrics } from './abn-experiments.js';
import { generateBreakageMetrics } from '../metrics.js';

/**
 * @typedef {import('../settings.js')} Settings
 * @typedef {import('./remote-config.js').default} RemoteConfig
 * @typedef {import('./abn-experiments.js').default} AbnExperimentMetrics
 */

const TDS_OVERRIDE_SETTINGS_KEY = 'tdsOverride';
const CONTENT_BLOCKING = 'contentBlocking';

export default class TDSStorage {
    /**
     * @param {{
     *  settings: Settings,
     *  remoteConfig: RemoteConfig,
     *  abnMetrics: AbnExperimentMetrics?
     * }} opts
     */
    constructor({ settings, remoteConfig, abnMetrics }) {
        this.settings = settings;
        this.remoteConfig = remoteConfig;
        this.abnMetrics = abnMetrics;
        /** @deprecated config is an alias of remoteConfig */
        this.config = this.remoteConfig;
        this.surrogates = new ResourceLoader(
            {
                name: 'surrogates',
                localUrl: '/data/surrogates.txt',
                format: 'text',
            },
            { settings },
        );
        this.tds = new ResourceLoader(
            {
                name: 'tds',
                remoteUrl: this.getTDSUrl.bind(this),
                updateIntervalMinutes: 15,
            },
            { settings },
        );
        this.remoteConfig.onUpdate(() => {
            setTimeout(this.checkShouldOverrideTDS.bind(this), 1)
        });
    }

    ready() {
        return Promise.all([this.tds.ready, this.surrogates.ready, this.remoteConfig.ready]);
    }

    async getTDSUrl() {
        await this.config.ready;
        const overridePath = this.settings.getSetting(TDS_OVERRIDE_SETTINGS_KEY);
        if (overridePath) {
            return `https://staticcdn.duckduckgo.com/trackerblocking/${overridePath}`;
        }
        return constants.tdsLists[1].url;
    }

    checkShouldOverrideTDS() {
        const contentBlockingSubFeatures = this.config.config?.features[CONTENT_BLOCKING].features || {};
        const enabledBlocklistOverrides = Object.keys(contentBlockingSubFeatures).filter(
            (k) => k.startsWith('TDS') && this.config.isSubFeatureEnabled(CONTENT_BLOCKING, k),
        );
        if (enabledBlocklistOverrides.length > 0 && this.abnMetrics) {
            const subFeatureName = enabledBlocklistOverrides[0];
            const overrideSubFeature = contentBlockingSubFeatures[subFeatureName];
            // If this is enabled via an experiment, the override URL is defined as `${cohortName}Url`, otherwise, for a normal rollout use `nextUrl`.
            const settingsKey = `${this.remoteConfig.getCohortName(CONTENT_BLOCKING, subFeatureName) || 'next'}Url`;
            const overridePath = overrideSubFeature.settings && overrideSubFeature.settings[settingsKey];
            if (!overridePath) {
                console.warn(`Couldn't find TDS override path in subfeature settings.`);
                return;
            }
            if (overridePath !== this.settings.getSetting(TDS_OVERRIDE_SETTINGS_KEY)) {
                console.log('TDS URL override changed to ', overridePath);
                this.settings.updateSetting(TDS_OVERRIDE_SETTINGS_KEY, overridePath);
                this.tds.checkForUpdates(true);
            }
            this.abnMetrics.markExperimentEnrolled(CONTENT_BLOCKING, subFeatureName, [
                ...generateRetentionMetrics(),
                ...generateBreakageMetrics(),
            ]);
        } else if (this.settings.getSetting(TDS_OVERRIDE_SETTINGS_KEY)) {
            // User removed from experiment/rollout, reset TDS override and fetch default list
            this.settings.removeSetting(TDS_OVERRIDE_SETTINGS_KEY);
            this.tds.checkForUpdates(true);
        }
    }
}
