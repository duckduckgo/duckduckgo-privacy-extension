import constants from '../../../data/constants'
import { convertState } from './privacy-dashboard-data'
import tdsStorage from '../storage/tds'

const Companies = require('../companies')

/**
 * @typedef {import('../trackers').ActionName} ActionName
 * @typedef {import('../trackers').TrackerData} TrackerData
 * @typedef {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').DetectedRequest} DetectedRequest
 * @typedef {DetectedRequest & { action: ActionName }} DetectedRequestWithAction
 */

export class Tracker {
    /**
     * @param {TrackerData | null} t
     */
    constructor (t) {
        /** @type {Record<string, DetectedRequestWithAction>} */
        this.urls = {}
        this.count = 0 // request count
        // Used for class deserizalization
        if (!t) {
            return
        }
        if (!t.tracker) {
            throw new Error('Tracker object required for Tracker constructor')
        }
        this.parentCompany = Companies.get(t.tracker.owner.ownedBy || t.tracker.owner.name)
        this.displayName = this.parentCompany?.displayName || t.tracker.owner.displayName
        this.prevalence = tdsStorage.tds.entities[t.tracker.owner.name]?.prevalence
    }

    /**
     * A parent company may try to track you through many different entities.
     * We store a list of all unique urls here.
     * @param {TrackerData} t
     * @param {string} tabUrl
     * @param {string} baseDomain
     * @param {string} url
     */
    addTrackerUrl (t, tabUrl, baseDomain, url) {
        // don't consider first-party requests at all
        if (t.sameBaseDomain) {
            return
        }

        this.count += 1

        // make a key from `fullTrackerDomain` + action to ensure we only deliver 1 entry per domain + status.
        const key = t.fullTrackerDomain + ':' + t.action

        // return early if this combination exists.
        if (this.urls[key]) return

        const state = convertState(t.action, t.sameEntity)

        // if we can't convert the state, do nothing.
        if (!state) return

        // Choose the first tracker radar category that we accept
        const category = t.tracker?.categories?.find(trackerRadarCategory => constants.displayCategories.includes(trackerRadarCategory))

        /** @type {DetectedRequestWithAction} */
        const detectedRequest = {
            action: t.action,
            url,
            eTLDplus1: baseDomain,
            pageUrl: tabUrl,
            entityName: this.displayName,
            prevalence: this.prevalence,
            ownerName: this.parentCompany?.name,
            category,
            state
        }

        this.urls[key] = detectedRequest
    }

    /**
     * @param {Tracker} data
     * @returns {Tracker}
     */
    static restore (data) {
        const tracker = new Tracker(null)
        for (const [key, value] of Object.entries(data)) {
            tracker[key] = value
        }
        return tracker
    }
}
