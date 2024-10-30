import browser from 'webextension-polyfill'
import ATB from '../atb.js'
import { flushSessionRules } from '../dnr-session-rule-id.js'
import { clearInvalidDynamicRules } from '../dnr-utils.js'
import { refreshUserAllowlistRules } from '../dnr-user-allowlist.js'
import { ensureGPCHeaderRule } from '../dnr-gpc.js'
import { onConfigUpdate } from '../dnr-config-rulesets.js'

/**
 * @typedef {import('./tds.js').default} TDS
 * @typedef {import('../settings.js')} Settings
 * @typedef {import('./trackers.js').default} Trackers
 */

export default class DNRListeners {
    /**
     * This component hooks up DNR library functions to various listeners so they can react to
     * resource state and set DNR rules accordingly. Currently listens for:
     *  - Config loading and updates.
     *  - Blocklist loading and updates.
     *  - Settings changes (for the GPC setting).
     *  - Extension install and update events.
     *
     * @param {{
    *  settings: Settings;
    *  tds: TDS;
    * }} options
    */
    constructor ({ settings, tds }) {
        this.featureName = 'DNR'
        this.settings = settings
        this.tds = tds
        browser.runtime.onInstalled.addListener(this.postInstall.bind(this))
        tds.config.onUpdate(onConfigUpdate)
        tds.tds.onUpdate(onConfigUpdate)
        this.settings.onSettingUpdate.addEventListener(
            'GPC', async () => {
                await this.tds.config.ready
                ensureGPCHeaderRule(this.tds.config.data)
            }
        )
    }

    async postInstall () {
        await this.settings.ready()
        // remove any orphaned session rules (can happen on extension update/restart)
        await flushSessionRules()
        // check that the dynamic rule state is consistent with the rule ranges we expect
        clearInvalidDynamicRules()
        // create ATB rule if there is a stored value in settings
        ATB.setOrUpdateATBdnrRule(this.settings.getSetting('atb'))

        // Refresh the user allowlisting declarativeNetRequest rule, only
        // necessary to handle the upgrade between MV2 and MV3 extensions.
        // TODO: Remove this a while after users have all been migrated to
        //       the MV3 build.
        const allowlist = this.settings.getSetting('allowlisted') || {}
        const allowlistedDomains = []
        for (const [domain, enabled] of Object.entries(allowlist)) {
            if (enabled) {
                allowlistedDomains.push(domain)
            }
        }
        await refreshUserAllowlistRules(allowlistedDomains)
    }
}
