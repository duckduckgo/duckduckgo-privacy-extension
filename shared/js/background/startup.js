/* global BUILD_TARGET */
import browser from 'webextension-polyfill'
import { NewTabTrackerStats } from './newtab-tracker-stats'
import { TrackerStats } from './classes/tracker-stats.js'
import httpsStorage from './storage/https'
import tdsStorage from './storage/tds'
const utils = require('./utils')
const Companies = require('./companies')
const experiment = require('./experiments')
const https = require('./https')
const settings = require('./settings')
const tabManager = require('./tab-manager')
const trackers = require('./trackers')
const dnrSessionId = require('./dnr-session-rule-id')
const { fetchAlias, showContextMenuAction } = require('./email-utils')
/** @module */

let resolveReadyPromise
const readyPromise = new Promise(resolve => { resolveReadyPromise = resolve })

export async function onStartup () {
    if (BUILD_TARGET === 'chrome-mv3') {
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
    if (BUILD_TARGET !== 'firefox' && utils.getBrowserName() === 'chrome') {
        try {
            // build up dependencies
            const trackerStats = new TrackerStats()
            const newTabTrackerStats = new NewTabTrackerStats(trackerStats)

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

    if (resolveReadyPromise) {
        resolveReadyPromise()
        resolveReadyPromise = null
    }
}

export function ready () {
    return readyPromise
}
