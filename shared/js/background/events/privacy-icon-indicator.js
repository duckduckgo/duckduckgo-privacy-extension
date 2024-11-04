import { iconPaths } from '../../../data/constants'
import { setActionIcon } from '../wrapper'

/**
 * The 'browser action icon' action has 2 possible variants
 *
 * 1) Our regular Dax Icon
 * 2) Greyed-out Dax Icon (special state)
 *
 * @param {import("../classes/site").default} site
 * @param {number} tabId
 * @returns {Promise<void>}
 */
export function updateActionIcon(site, tabId) {
    // For the icon state, we consider 'protections enabled' to mean
    //    1) user has not manually added this site to their `allowlist`
    //    2) AND the 'contentBlocking' feature is enabled
    const protectionsEnabled = !site.allowlisted && site.isFeatureEnabled('contentBlocking')

    // Enabled: regular icon
    // Disabled: special state, greyed-out Dax
    const nextIcon = protectionsEnabled ? iconPaths.regular : iconPaths.withSpecialState

    // now call out to the browser wrapper to actually change the icon
    return setActionIcon(nextIcon, tabId)
}
