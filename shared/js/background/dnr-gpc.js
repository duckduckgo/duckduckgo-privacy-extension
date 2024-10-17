import settings from './settings'
import tdsStorage from './storage/tds'
import { GPC_HEADER_RULE_ID } from './dnr-utils'
import { generateGPCheaderRule } from '@duckduckgo/ddg2dnr/lib/gpc'

/**
 * Ensure that the rule to add Global Privacy Control (GPC) request headers is
 * added when the feature is enabled, and removed when the feature is disabled.
 * @param {Object} config
 *   The privacy configuration.
 * @return {Promise}
 */
export async function ensureGPCHeaderRule (config = null) {
    const removeRuleIds = [GPC_HEADER_RULE_ID]
    const addRules = []

    if (!config) {
        await tdsStorage.ready('config')
        config = tdsStorage.config
    }

    const gpcEnabled = settings.getSetting('GPC') &&
          config?.features?.gpc?.state === 'enabled'

    if (gpcEnabled) {
        addRules.push(
            generateGPCheaderRule(
                GPC_HEADER_RULE_ID,
                config.features.gpc.exceptions?.map(e => e.domain)
            )
        )
    }

    await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds, addRules
    })
}
