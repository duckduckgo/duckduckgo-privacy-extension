import { getExtensionVersion } from './wrapper'
import { isFeatureEnabled } from './utils'
import { ensureGPCHeaderRule } from './dnr-gpc'
import {
    ensureServiceWorkerInitiatedRequestExceptions
} from './dnr-service-worker-initiated'
import { getDenylistedDomains } from './dnr-user-allowlist'
import { findExistingDynamicRule, SETTING_PREFIX, ruleIdRangeByConfigName } from './dnr-utils'
import {
    generateExtensionConfigurationRuleset
} from '@duckduckgo/ddg2dnr/lib/extensionConfiguration'
import {
    generateTdsRuleset
} from '@duckduckgo/ddg2dnr/lib/tds'
import {
    generateDNRRule
} from '@duckduckgo/ddg2dnr/lib/utils'
import {
    generateCombinedConfigBlocklistRuleset
} from '@duckduckgo/ddg2dnr/lib/combined'

/**
 * A dummy etag rule is saved with the declarativeNetRequest rules generated for
 * each configuration. That way, a consistent extension state (between tds
 * configurations, extension settings and declarativeNetRequest rules) can be
 * ensured.
 * @param {number} id
 * @param {string} etag
 * @returns {chrome.declarativeNetRequest.Rule}
 */
function generateEtagRule (id, etag) {
    return generateDNRRule({
        id,
        priority: 1,
        actionType: 'allow',
        urlFilter: etag,
        requestDomains: ['etag.invalid']
    })
}

let ruleUpdateLock = Promise.resolve()

export default class DNRConfigRulesets {
    /**
     * @param {{
     *  settings: import('./settings');
     *  tds: import('./components/tds').default;
     *  trackers: import('./components/trackers').default;
     * }} options
     */
    constructor ({ settings, tds, trackers }) {
        this.settings = settings
        this.tds = tds
        this.trackers = trackers
    }

    /**
     * Check if the declarativeNetRequest rules for a configuration need to be
     * updated. Returns true if so, false if they are already up to date.
     * @param {string} configName
     * @param {Object} expectedState
     * @returns {Promise<boolean>}
     */
    async configRulesNeedUpdate (configName, expectedState) {
        const settingName = SETTING_PREFIX + configName
        await this.settings.ready()
        const settingValue = this.settings.getSetting(settingName)

        // No setting saved for the configuration yet, this is likely the first time
        // it has been updated - rules definitely need to be updated.
        if (!settingValue) {
            return true
        }

        // To be sure the rules are up to date, there must be an expected etag.
        if (!expectedState.etag) {
            return true
        }

        // If any of the setting values aren't as expected, the rules could be out
        // of date.
        for (const [key, value] of Object.entries(expectedState)) {
            if (settingValue[key] !== value) {
                return true
            }
        }

        // Find the etag rule for this configuration.
        const [etagRuleId] = ruleIdRangeByConfigName[configName]
        const existingEtagRule = await findExistingDynamicRule(etagRuleId)

        // If none exists, the rules definitely need to be updated.
        if (!existingEtagRule) {
            return true
        }

        // Otherwise, the rules only need be updated if the etags no longer match.
        return existingEtagRule.condition.urlFilter !== expectedState.etag
    }

    /**
     * Utility function that takes the extension config, and returns a minimal
     * config Object with disabled/unsupported features + unnecessary metadata
     * removed.
     * Note: Does not mutate the original config Object, but the returned config is
     *       equally not safe to mutate as it shares some Object references.
     * @param {Object} config
     * @returns {Object}
     */
    minimalConfig ({ unprotectedTemporary, features }) {
        const result = { features: { }, unprotectedTemporary }

        for (const featureName of Object.keys(features)) {
            if (isFeatureEnabled(featureName, this.tds.config.data)) {
                result.features[featureName] = features[featureName]
            }
        }

        return result
    }

    /**
     * Update the declarativeNetRequest rules and corresponding state in settings
     * for a configuration.
     * @param {string} configName
     * @param {Object} latestState
     * @param {chrome.declarativeNetRequest.Rule[]} rules
     * @param {Object} matchDetailsByRuleId
     * @returns {Promise<>}
     */
    async updateConfigRules (
        configName, latestState, rules, matchDetailsByRuleId, allowingRulesByClickToLoadAction = {}
    ) {
        const [ruleIdStart, ruleIdEnd] = ruleIdRangeByConfigName[configName]
        const etagRuleId = ruleIdStart
        const maxNumberOfRules = ruleIdEnd - ruleIdStart

        const { etag } = latestState

        if (!rules) {
            console.error(
                'No declarativeNetRequest rules generated for configuration: ',
                configName, '(Etag: ', etag, ')'
            )
            return
        }

        // Add the new etag rule.
        rules.push(generateEtagRule(etagRuleId, etag))

        if (rules.length > maxNumberOfRules) {
            console.error(
                'Too many declarativeNetRequest rules generated for configuration: ',
                configName,
                '(Etag: ', etag, ', Rules generated: ', rules.length, ')'
            )
            return
        }

        // Ensure any existing rules for the configuration are removed.
        const removeRuleIds = []
        for (let i = ruleIdStart; i <= ruleIdEnd; i++) {
            removeRuleIds.push(i)
        }

        // Install the updated rules.
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds, addRules: rules
        })

        // Then update the setting entry.
        const settingName = SETTING_PREFIX + configName
        const settingValue = {
            matchDetailsByRuleId
        }
        for (const key of Object.keys(latestState)) {
            settingValue[key] = latestState[key]
        }

        await this.settings.ready()
        if (Object.keys(allowingRulesByClickToLoadAction).length) {
            this.settings.updateSetting('allowingDnrRulesByClickToLoadRuleAction', allowingRulesByClickToLoadAction)
        }
        this.settings.updateSetting(settingName, settingValue)
    }

    /**
     * Utility function to regenerate the declarativeNetRequest rules for the
     * extension configuration (extension-config.json). The configuration's value
     * and etag can optionally be passed in (e.g. when the configuration has just
     * been updated), but will be read from settings storage otherwise.
     * @param {string?} etag
     * @param {object?} configValue
     * @returns {Promise<>}
     */
    async updateExtensionConfigRules (etag = null, configValue = null) {
        const extensionVersion = getExtensionVersion()
        const denylistedDomains = await getDenylistedDomains(this.settings)

        const latestState = {
            extensionVersion,
            denylistedDomains: denylistedDomains.join(),
            etag
        }

        if (!configValue) {
            await this.tds.config.ready
            configValue = this.tds.config.data
        }

        if (!etag) {
            const settingName = SETTING_PREFIX + 'config'
            await this.settings.ready()
            await this.tds.config.ready
            const settingValue = this.settings.getSetting(settingName)
            if (!settingValue?.etag) {
                // Should not be possible, but if the etag is unknown at this point
                // there's not much that can be done.
                return
            }
            latestState.etag = settingValue.etag
        }

        if (!(await this.configRulesNeedUpdate('config', latestState))) {
            return
        }

        const [ruleIdStart] = ruleIdRangeByConfigName.config
        const {
            ruleset, matchDetailsByRuleId
        } = await generateExtensionConfigurationRuleset(
            this.minimalConfig(configValue),
            denylistedDomains,
            chrome.declarativeNetRequest.isRegexSupported,
            ruleIdStart + 1
        )

        await this.updateConfigRules(
            'config', latestState, ruleset, matchDetailsByRuleId
        )
    }

    async updateCombinedConfigBlocklistRules () {
        const extensionVersion = getExtensionVersion()
        const denylistedDomains = await getDenylistedDomains(this.settings)
        const tdsEtag = this.settings.getSetting('tds-etag')
        const combinedState = {
            etag: `${this.settings.getSetting('config-etag')}-${tdsEtag}`,
            denylistedDomains: denylistedDomains.join(),
            extensionVersion
        }
        // require a blocklist before generating rules - config is optional
        if (tdsEtag && await this.configRulesNeedUpdate('combined', combinedState)) {
            const {
                ruleset, matchDetailsByRuleId
            } = generateCombinedConfigBlocklistRuleset(
                this.tds.tds.data,
                this.minimalConfig(this.tds.config.data),
                denylistedDomains,
                ruleIdRangeByConfigName.combined[0] + 1
            )
            await this.updateConfigRules('combined', combinedState, ruleset, matchDetailsByRuleId)
        }
    }

    /**
     * tdsStorage.onUpdate listener which is called when the configurations are
     * updated and when the background ServiceWorker is restarted.
     * Note: Only exported for use by unit tests, do not call manually.
     * @param {import('./components/resource-loader').ResourceName} configName
     * @param {string} etag
     * @param {object} configValue
     * @returns {Promise}
     */
    async onConfigUpdate (configName, etag, configValue) {
        const extensionVersion = getExtensionVersion()
        console.log('update', configName, etag, configValue)
        // Run an async lock on all blocklist updates so the latest update is always processed last
        ruleUpdateLock = ruleUpdateLock.then(async () => {
        // TDS (aka the block list).
            if (configName === 'tds') {
                const [ruleIdStart] = ruleIdRangeByConfigName[configName]
                const latestState = { etag, extensionVersion }
                if (!(await this.configRulesNeedUpdate(configName, latestState))) {
                    return
                }

                // All tds storage must have loaded before we can be sure that the surrogates are set
                await this.tds.tds.ready
                const supportedSurrogates = new Set(Object.keys(this.trackers.trackers.surrogateList))

                const {
                    ruleset, matchDetailsByRuleId, allowingRulesByClickToLoadAction
                } = await generateTdsRuleset(
                    configValue,
                    supportedSurrogates,
                    '/web_accessible_resources/',
                    chrome.declarativeNetRequest.isRegexSupported,
                    ruleIdStart + 1
                )

                await this.updateConfigRules(configName, latestState, ruleset, matchDetailsByRuleId, allowingRulesByClickToLoadAction)
            // Extension configuration.
            } else if (configName === 'config') {
                await this.updateExtensionConfigRules(etag, configValue)
                await ensureGPCHeaderRule(configValue)
                await ensureServiceWorkerInitiatedRequestExceptions(configValue)
            }
            // combined rules (cookie blocking)
            await this.updateCombinedConfigBlocklistRules()
        })
        await ruleUpdateLock
    }

    /**
     * Update all the extension configuration rulesets, so that the
     * declarativeNetRequest rules generated for the contentBlocking and
     * unprotectedTemporary allowlisting features take care to exclude the
     * user "denylisted" domains.
     * @return {Promise}
     */
    async updateUserDenylist () {
        await this.updateExtensionConfigRules()
        await this.updateCombinedConfigBlocklistRules()
    }
}
