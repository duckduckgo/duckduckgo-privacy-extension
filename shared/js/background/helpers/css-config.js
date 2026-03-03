/**
 * Adapts content-scope-scripts config processing utilities for use in the extension background.
 *
 * C-S-S's `processConfig` runs in content script context (depends on document.location).
 * This module provides the same config processing pipeline for the extension background
 * by importing C-S-S's core utilities directly: `computeEnabledFeatures` and `parseFeatureSettings`.
 */
import { computeEnabledFeatures, parseFeatureSettings } from '@duckduckgo/content-scope-scripts/injected/src/utils.js';
import tdsStorage from '../storage/tds';
import { getExtensionVersion } from '../wrapper';

export { computeEnabledFeatures, parseFeatureSettings };

/**
 * @typedef {import('@duckduckgo/content-scope-scripts/injected/src/utils.js').RemoteConfig} CSSRemoteConfig
 * @typedef {import('@duckduckgo/content-scope-scripts/injected/src/utils.js').Platform} CSSPlatform
 * @typedef {import('@duckduckgo/content-scope-scripts/injected/src/content-scope-features.js').LoadArgs} LoadArgs
 */

/**
 * Get the platform object with the extension version populated.
 * @returns {CSSPlatform}
 */
export function getExtensionPlatform() {
    return {
        name: 'extension',
        version: getExtensionVersion(),
    };
}

/**
 * Compute enabled features for a given hostname using C-S-S's computeEnabledFeatures.
 * This replaces the manual iteration in extension/utils.js getEnabledFeatures().
 *
 * @param {string} hostname - The hostname to check features for
 * @param {CSSRemoteConfig} [config] - Remote config (defaults to tdsStorage.config)
 * @returns {string[]}
 */
export function getEnabledFeaturesFromCSS(hostname, config) {
    const data = config || tdsStorage.config;
    const platform = getExtensionPlatform();
    return computeEnabledFeatures(data, hostname, platform);
}

/**
 * Build the args object required by ConfigFeature from extension state.
 * This creates the same shape as LoadArgs used by C-S-S features.
 *
 * @param {{
 *  url: string,
 *  domain: string,
 *  enabledFeatures?: string[],
 *  isBroken?: boolean,
 *  allowlisted?: boolean,
 *  currentCohorts?: Array<{feature: string, subfeature: string, cohort: string | null}>,
 *  debug?: boolean,
 * }} options
 * @returns {LoadArgs}
 */
export function buildConfigFeatureArgs({
    url,
    domain,
    enabledFeatures,
    isBroken = false,
    allowlisted = false,
    currentCohorts,
    debug = false,
}) {
    const config = tdsStorage.config;
    const platform = getExtensionPlatform();
    const resolvedEnabledFeatures = enabledFeatures || getEnabledFeaturesFromCSS(domain, config);
    const featureSettings = parseFeatureSettings(config, resolvedEnabledFeatures);

    return {
        site: {
            domain,
            url,
            isBroken,
            allowlisted,
            enabledFeatures: resolvedEnabledFeatures,
        },
        platform,
        bundledConfig: config,
        featureSettings,
        currentCohorts: currentCohorts?.filter((c) => c.cohort != null) || [],
        messagingContextName: 'contentScopeScripts',
        debug,
    };
}
