import { NewTabTrackerStats } from './newtab-tracker-stats'
import { TrackerStats } from './classes/tracker-stats.js'
import { BrowserWrapper } from './wrapper'
import { Settings } from './settings'
import { TDSStorage } from './storage/tds'
const utils = require('./utils')
const experiment = require('./experiments')
const trackers = require('./trackers')
const dnrSessionId = require('./dnr-session-rule-id')
const { fetchAlias, showContextMenuAction } = require('./email-utils')
/** @module */

let resolveReadyPromise
const readyPromise = new Promise(resolve => { resolveReadyPromise = resolve })

/**
 * @param {object} params
 * @param {import("./companies").Companies} params.companies
 * @param {import("./tab-manager").TabManager} params.tabManager
 * @param {import("./https").HTTPS} params.https
 * @param {import("./storage/https").HTTPSStorage} params.httpsStorage
 * @param {import("./wrapper").BrowserWrapper} params.browser
 * @param {import("./storage/tds").TDSStorage} params.tdsStorage
 * @param {import("./settings").Settings} params.settings
 */
export async function onStartup (params) {
    const { companies, tabManager, https, httpsStorage, browser, tdsStorage, settings } = params;

    if (browser.getManifestVersion() === 3) {
        await dnrSessionId.setSessionRuleOffsetFromStorage()
    }

    await settings.ready()
    experiment.setActiveExperiment()

    try {
        const httpsLists = await httpsStorage.getLists(/* preferLocal= */true)
        https.setLists(httpsLists)
    } catch (e) {
        console.warn('Error loading https lists', e)
    }
    try {
        const tdsLists = await tdsStorage.getLists(/* preferLocal= */true)
        trackers.setLists(tdsLists)
    } catch (e) {
        console.warn('Error loading tds lists', e)
    }

    companies.buildFromStorage()

    /**
     * in Chrome only, try to initiate the `NewTabTrackerStats` feature
     */
    if (utils.getBrowserName() === 'chrome') {
        try {
            // build up dependencies
            const trackerStats = new TrackerStats()
            const newTabTrackerStats = new NewTabTrackerStats(trackerStats, browser, tdsStorage)

            // Assign the singleton instance to the class for re-use in things like debugging
            // this is an alternative to instantiating the class in the module scope where it lives
            NewTabTrackerStats.shared = newTabTrackerStats

            // restore from storage first
            await newTabTrackerStats.restoreFromStorage()

            // now setup extension listeners
            newTabTrackerStats.register()
        } catch (e) {
            console.warn('an error occurred setting up TrackerStats', e)
        }
    }

    // fetch alias if needed
    const userData = settings.getSetting('userData')
    if (userData && userData.token) {
        if (!userData.nextAlias) await fetchAlias()
        showContextMenuAction()
    }

    const savedTabs = await browser.tabs.query({ status: 'complete' })
    for (let i = 0; i < savedTabs.length; i++) {
        const tab = savedTabs[i]

        if (tab.url) {
            // On reinstall we wish to create the tab again
            await tabManager.restoreOrCreate(tab)
        }
    }

    if (resolveReadyPromise) {
        resolveReadyPromise()
        resolveReadyPromise = null
    }
}

export function ready () {
    return readyPromise
}
