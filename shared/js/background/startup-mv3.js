import browser from 'webextension-polyfill'
import experiment from './experiments'
import * as settings from './settings'
import * as dnrSessionId from './dnr-session-rule-id'

import remoteTds from './features/remote-tds'
import tabTracking from './features/tab-tracking'
import atb from './features/atb'

browser.runtime.onInstalled.addListener(async (details) => {
    remoteTds.onInstalled()
    if (details.reason.match(/install/)) {
        await settings.ready()
        settings.updateSetting('showWelcomeBanner', true)
        atb.onInstalled()
    } else if (details.reason.match(/update/)) {
        atb.onUpdated()
    }
})

export async function startup () {
    // Run these init steps in parallel on the first tick
    const [, tabManager,,] = await Promise.all([
        dnrSessionId.setSessionRuleOffsetFromStorage(),
        tabTracking.init(),
        settings.ready(),
        experiment.setActiveExperiment()
    ])
    // tds init runs after settings
    const tds = await remoteTds.init()
    return {
        settings,
        tds,
        tabManager
    }
}
