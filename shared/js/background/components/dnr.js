import browser from 'webextension-polyfill'
import ATB from '../atb'
import { flushSessionRules } from '../dnr-session-rule-id'
import { clearInvalidDynamicRules } from '../dnr-utils'
import { refreshUserAllowlistRules } from '../dnr-user-allowlist'
import DNRConfigRulesets from '../dnr-config-rulesets'
import { ensureGPCHeaderRule } from '../dnr-gpc'

/**
 * @typedef {import('./tds.js').default} TDS
 * @typedef {import('../settings.js')} Settings
 * @typedef {import('./trackers.js').default} Trackers
 */

export default class DNR {
    /**
     * @param {{
    *  settings: Settings;
    *  tds: TDS;
    *  trackers: Trackers;
    * }} options
    */
    constructor ({ settings, tds, trackers }) {
        this.featureName = 'DNR'
        this.settings = settings
        this.tds = tds
        this.dnrConfigRulesets = new DNRConfigRulesets({ settings, tds, trackers })
        browser.runtime.onInstalled.addListener(this.postInstall.bind(this))
        tds.config.onUpdate(this.dnrConfigRulesets.onConfigUpdate.bind(this.dnrConfigRulesets))
        tds.tds.onUpdate(this.dnrConfigRulesets.onConfigUpdate.bind(this.dnrConfigRulesets))
        this.settings.onSettingUpdate.addEventListener(
            'GPC', () => { ensureGPCHeaderRule(this.tds.config.data) }
        )
    }

    async postInstall () {
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

    async updateUserDenylist () {
        await this.dnrConfigRulesets.updateUserDenylist()
    }
}
