import tdsStorage from './storage/tds'
import { sendTabMessage } from './utils'

/**
 * Find the enabled Click to Load rule actions for the given tab.
 * Note: Take care to ensure wait for the extension configuration to be ready
 *       first.
 * @param {import('./classes/tab')} tab
 * @return {string[]}
 */
export function getDefaultEnabledClickToLoadRuleActionsForTab(tab) {
    // Click to Load feature isn't supported or is disabled for the tab.
    if (!tab?.site?.isFeatureEnabled('clickToLoad')) {
        return []
    }

    const clickToLoadSettings = tdsStorage?.config?.features?.clickToLoad?.settings

    // Click to Load configuration isn't ready yet.
    if (!clickToLoadSettings) {
        console.warn('Click to Load configuration not ready yet, skipped.')
        return []
    }

    const enabledRuleActions = []
    const { parentEntity } = tab.site

    for (const [entity, { ruleActions, state }] of Object.entries(clickToLoadSettings)) {
        // No rule actions, or entity is disabled.
        if (!ruleActions || ruleActions.length === 0 || state !== 'enabled') {
            continue
        }

        // Enabled Click to Load entity is third-party for this tab, note its
        // rule actions.
        if (parentEntity !== entity) {
            enabledRuleActions.push(...ruleActions)
        }
    }

    return enabledRuleActions
}

/**
 * Triggers a refresh of the Click to Load placeholders for the given tab.
 * @param {import('./classes/tab')} tab
 * @param {string} [ruleAction]
 *   If provided, only placeholders associated with the entity containing that
 *   rule action will be refreshed. By default, all placeholders will be
 *   refreshed.
 */
export async function displayClickToLoadPlaceholders(tab, ruleAction) {
    const message = {
        type: 'update',
        feature: 'clickToLoad',
        messageType: 'displayClickToLoadPlaceholders',
        options: {},
    }
    if (typeof ruleAction === 'string') {
        message.options.ruleAction = ruleAction
    }

    await sendTabMessage(tab.id, message)
}
