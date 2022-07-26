const Companies = require('../companies.es6')
const tdsStorage = require('../storage/tds.es6')

/**
 * @typedef {import('../trackers.es6').ActionName} ActionName
 * @typedef {import('../trackers.es6').TrackerData} TrackerData
 */

export class TrackerSite {
    /**
     * @param {ActionName} action
     * @param {string} reason
     * @param {string[]} categories
     * @param {boolean} isFirstParty
     */
    constructor (action, reason, categories, isFirstParty) {
        /** @type {ActionName} */
        this.action = action
        this.reason = reason
        this.categories = categories
        this.isBlocked = this.action === 'block' || this.action === 'redirect'
        this.isNonTracker = this.action === 'none'
        this.isFirstParty = isFirstParty
    }
}

export class Tracker {
    constructor (t) {
        this.parentCompany = Companies.get(t.tracker.owner.name)
        this.displayName = t.tracker.owner.displayName
        this.prevalence = tdsStorage.tds.entities[t.tracker.owner.name]?.prevalence
        /** @type {Record<string, TrackerSite>} */
        this.urls = {}
        this.count = 0 // request count
        this.addTrackerUrl(t)
        this.type = t.type || ''
    }

    /**
     * A parent company may try to track you through many different entities.
     * We store a list of all unique urls here.
     * @param {TrackerData} t
     */
    addTrackerUrl (t) {
        this.count += 1
        if (!this.urls[t.fullTrackerDomain]) {
            this.urls[t.fullTrackerDomain] = new TrackerSite(t.action, t.reason, t.tracker?.categories || [], t.firstParty)
        }
    }
}
