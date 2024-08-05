import { getDefaultEnabledClickToLoadRuleActionsForTab } from './click-to-load'
import { getNextSessionRuleId } from './dnr-session-rule-id'
import settings from './settings'
import tdsStorage from './storage/tds'

/**
 * Generates the declarativeNetRequest allowing rules required to disable the
 * specified Click to Load rule action for the given tab. If the tab already has
 * the required declarativeNetRequest allowing rules, none are returned. If
 * declarativeNetRequest rules are returned, the tab's rule lookup is also
 * mutated to note the new rule IDs as a side effect.
 * @param {string} ruleAction
 * @param {import('./classes/tab')} tab
 * @return {Promise<DNRRuleWithID[]>}
 */
async function generateDnrAllowingRules (tab, ruleAction) {
    // The necessary declarativeNetRequest allowing rules already exist for this
    // tab, nothing to do.
    const existingRuleIds =
        tab.dnrRuleIdsByDisabledClickToLoadRuleAction[ruleAction]
    if (existingRuleIds && existingRuleIds.length > 0) {
        return []
    }

    // Load the Click to Load declarativeNetRequest allowing rule lookup from
    // the settings.
    await settings.ready()
    const allowingDnrRulesByClickToLoadRuleAction =
        settings.getSetting('allowingDnrRulesByClickToLoadRuleAction')
    if (!allowingDnrRulesByClickToLoadRuleAction) {
        console.warn('Failed to load Click to Load allowing rules.')
        return []
    }

    // Find the correct declarativeNetRequest allowing rules for this Click to
    // Load rule action.
    let allowingRules = allowingDnrRulesByClickToLoadRuleAction[ruleAction]
    if (!allowingRules) {
        console.warn(`No Click to Load allowing rules for action ${ruleAction}.`)
        return []
    }

    // Make a copy of those declarativeNetRequest rules and assign IDs and
    // tab ID matching rule conditions.
    const ruleIds = []
    allowingRules = JSON.parse(JSON.stringify(allowingRules))
    for (const rule of allowingRules) {
        // Assign the rule ID.
        const ruleId = getNextSessionRuleId()
        if (typeof ruleId !== 'number') {
            // Not much that can be done if fetching the rule ID failed. Also,
            // no need to log a warning here as getNextSessionRuleId will have
            // done that already.
            continue
        }
        rule.id = ruleId
        ruleIds.push(ruleId)

        // Assign the tab ID condition.
        rule.condition.tabIds = [tab.id]
    }

    // Save the rule IDs on the Tab Object, so that the tab's rules can be
    // removed/updated as necessary later.
    if (ruleIds.length > 0) {
        tab.dnrRuleIdsByDisabledClickToLoadRuleAction[ruleAction] = ruleIds
    }

    return allowingRules
}

/**
 * Ensure the correct declarativeNetRequest allowing session rules are added so
 * that the default Click to Load rule actions are enabled/disabled for the tab.
 *
 * 1. The blocking declarativeNetRequest rules for Click to Load are added with
 *    the rules generated for the tracker block list (tds.json). Therefore, to
 *    start with all Click to Load rule actions are enabled.
 * 2. Session allowing declarativeNetRequest rules are added to disable Click to
 *    Load rule actions as necessary for tabs. That happens on both navigation
 *    (with this function) and when the user clicks to load content
 *    (@see {ensureClickToLoadRuleActionDisabled}).
 * 3. Finally, all of session allowing declarativeNetRequest rules are removed
 *    for a tab when it is closed (@see clearClickToLoadDnrRulesForTab).
 *
 * Factors that determine which Click to Load rule actions should be enabled for
 * a tab include the tab's origin, the extension configuration and the user's
 * list of allowlisted domains.
 * @param {import('./classes/tab')} tab
 * @return {Promise}
 */
export async function restoreDefaultClickToLoadRuleActions (tab) {
    const addRules = []
    const removeRuleIds = []

    await settings.ready()
    const allowingDnrRulesByClickToLoadRuleAction =
        settings.getSetting('allowingDnrRulesByClickToLoadRuleAction')
    if (!allowingDnrRulesByClickToLoadRuleAction) {
        console.warn('Click to Load DNR rules are not known yet, skipping.')
        return
    }

    // Assume all Click to Load rule actions should be disabled initially.
    const disabledRuleActions =
        new Set(Object.keys(allowingDnrRulesByClickToLoadRuleAction))

    // If the Click to Load feature is supported and enabled for this tab, see
    // which rule actions shouldn't be disabled.
    await tdsStorage.ready('config')
    for (const ruleAction of getDefaultEnabledClickToLoadRuleActionsForTab(tab)) {
        disabledRuleActions.delete(ruleAction)
    }

    // Tab was cleared by the time the extension configuration was read.
    if (!tab) {
        return
    }

    // Check which Click to Load rule actions are already disabled for the tab.
    for (const disabledRuleAction of
        Object.keys(tab.dnrRuleIdsByDisabledClickToLoadRuleAction)) {
        if (disabledRuleActions.has(disabledRuleAction)) {
            // Existing declarativeNetRequest rules can be reused, since this
            // Click to Load rule action should still be still be disabled.
            disabledRuleActions.delete(disabledRuleAction)
        } else {
            // Existing declarativeNetRequest rules should be cleared.
            for (const ruleId of
                tab.dnrRuleIdsByDisabledClickToLoadRuleAction[disabledRuleAction]) {
                removeRuleIds.push(ruleId)
            }
            delete tab.dnrRuleIdsByDisabledClickToLoadRuleAction[disabledRuleAction]
        }
    }

    // Generate any missing declarativeNetRequest allowing rules needed to
    // disable Click to Load rule actions for the tab.
    // Note: This also updates the dnrRuleIdsByDisabledClickToLoadRuleAction
    //       lookup for the tab.
    for (const disabledRuleAction of disabledRuleActions) {
        addRules.push(...await generateDnrAllowingRules(tab, disabledRuleAction))
    }

    // Notes:
    //  - The allowing declarativeNetRequest rule IDs for the tab are noted in
    //    the Tab Object before the rules are added. If there is a problem
    //    adding the rules, it will result in an inconsistent state.
    //  - There is a race condition between the declarativeNetRequest rules
    //    being added for a tab, and the (potentially blocked) requests from
    //    being made. This is made worse since some asynchronous operations are
    //    required (e.g. checking the extension configuration) to know which
    //    rules should be added/removed. It is possible that sometimes the
    //    blocking/allowing action will be incorrect if the request happens more
    //    quickly than the ruleset can be updated.
    //  - A future optimisation could be to add the allowing
    //    declarativeNetRequest rules for disabled Click to Load rule actions
    //    once for all tabs. But note that since there is already an
    //    optimisation to avoid removing+re-adding rules unnecessarily on
    //    navigation, it might not be worth the added code complexity.

    // Update the declarativeNetRequest session rules for the tab.
    if (addRules.length > 0 || removeRuleIds.length > 0) {
        return await chrome.declarativeNetRequest.updateSessionRules(
            { addRules, removeRuleIds }
        )
    }
}

/**
 * Ensure the necessary declarativeNetRequest allowing rules are added to
 * disable the given Click to Load rule action for the tab.
 * @param {string} ruleAction
 * @param {import('./classes/tab')} tab
 * @return {Promise}
 */
export async function ensureClickToLoadRuleActionDisabled (ruleAction, tab) {
    const addRules = await generateDnrAllowingRules(tab, ruleAction)

    if (addRules.length > 0) {
        return await chrome.declarativeNetRequest.updateSessionRules({ addRules })
    }
}

/**
 * Removes all Click to Load session declarativeNetRequest rules associated with
 * the given tab.
 * @param {import('./classes/tab')} tab
 * @return {Promise}
 */
export async function clearClickToLoadDnrRulesForTab (tab) {
    const removeRuleIds = Array.prototype.concat(
        ...Object.values(tab.dnrRuleIdsByDisabledClickToLoadRuleAction)
    )

    if (removeRuleIds.length > 0) {
        return await chrome.declarativeNetRequest.updateSessionRules(
            { removeRuleIds }
        )
    }
}
