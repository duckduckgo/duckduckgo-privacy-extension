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
     * @param {boolean} isSameEntity
     * @param {boolean} isSameBaseDomain
     * @param {string} url
     */
    constructor (action, reason, categories, isSameEntity, isSameBaseDomain, url) {
        /** @type {ActionName} */
        this.action = action
        this.reason = reason
        this.categories = categories
        this.isBlocked = this.action === 'block' || this.action === 'redirect'
        this.isSameEntity = isSameEntity
        this.isSameBaseDomain = isSameBaseDomain
        this.url = url
    }
}

export class Tracker {
    /**
     * @param {TrackerData | null} t
     * @param {string} baseDomain
     * @param {string} url
     */
    constructor (t, baseDomain, url) {
        /** @type {Record<string, Record<string, TrackerSite>>} */
        this.urls = {}
        this.count = 0 // request count
        this.baseDomain = baseDomain
        this.url = url
        // Used for class deserizalization
        if (!t) {
            return
        }
        if (!t.tracker) {
            throw new Error('Tracker object required for Tracker constructor')
        }
        this.parentCompany = Companies.get(t.tracker.owner.name)
        this.displayName = t.tracker.owner.displayName
        this.prevalence = tdsStorage.tds.entities[t.tracker.owner.name]?.prevalence
        this.addTrackerUrl(t, url)
    }

    /**
     * A parent company may try to track you through many different entities.
     * We store a list of all unique urls here.
     * @param {TrackerData} t
     * @param {string} url
     */
    addTrackerUrl (t, url) {
        this.count += 1
        if (!this.urls[t.fullTrackerDomain]) {
            this.urls[t.fullTrackerDomain] = {}
        }
        if (!this.urls[t.fullTrackerDomain][t.action]) {
            this.urls[t.fullTrackerDomain][t.action] = new TrackerSite(t.action, t.reason, t.tracker?.categories || [], t.sameEntity, t.sameBaseDomain, url)
        }
    }

    /**
     * @param {Tracker} data
     * @returns {Tracker}
     */
    static restore (data) {
        const tracker = new Tracker(null, data.baseDomain, data.url)
        for (const [key, value] of Object.entries(data)) {
            tracker[key] = value
        }
        return tracker
    }
}
