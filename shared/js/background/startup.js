/* global BUILD_TARGET */
import { NewTabTrackerStats } from './newtab-tracker-stats'
import { TrackerStats } from './classes/tracker-stats.js'
import httpsStorage from './storage/https'
import { clearExpiredBrokenSiteReportTimes } from './broken-site-report'
const utils = require('./utils')
const Companies = require('./companies')
const experiment = require('./experiments')
const https = require('./https')
const settings = require('./settings')
const dnrSessionId = require('./dnr-session-rule-id')
/** @module */

let resolveReadyPromise
const readyPromise = new Promise(resolve => { resolveReadyPromise = resolve })

export async function onStartup () {
    if (BUILD_TARGET === 'chrome') {
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

    await clearExpiredBrokenSiteReportTimes()

    if (resolveReadyPromise) {
        resolveReadyPromise()
        resolveReadyPromise = null
    }
}

export function ready () {
    return readyPromise
}
