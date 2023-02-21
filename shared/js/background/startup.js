import browser from 'webextension-polyfill'
import { NewTabTrackerStats } from './newtab-tracker-stats'
import { TrackerStats } from './classes/tracker-stats'
const utils = require('./utils')
const browserWrapper = require('./wrapper')
const Companies = require('./companies')
const experiment = require('./experiments')
const https = require('./https')
const httpsStorage = require('./storage/https')
const settings = require('./settings')
const tabManager = require('./tab-manager')
const tdsStorage = require('./storage/tds')
const trackers = require('./trackers')
const dnrSessionId = require('./dnr-session-rule-id')
const { fetchAlias, showContextMenuAction } = require('./email-utils')
const manifestVersion = browserWrapper.getManifestVersion()
/** @module */

let resolveReadyPromise
const readyPromise = new Promise(resolve => { resolveReadyPromise = resolve })

export async function onStartup () {
    if (manifestVersion === 3) {
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

    Companies.buildFromStorage()

    /**
     * in Chrome only, try to initiate the `NewTabTrackerStats` feature
     */
    if (utils.getBrowserName() === 'chrome') {
        try {
            // build up dependencies
            const trackerStats = new TrackerStats()
            const newTabTrackerStats = new NewTabTrackerStats(trackerStats)

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
