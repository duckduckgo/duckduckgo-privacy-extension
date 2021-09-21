import Companies from '../companies.es6'
import tdsStorage from '../storage/tds.es6'

export class Tracker {
    constructor (t) {
        this.parentCompany = Companies.get(t.tracker.owner.name)
        this.displayName = t.tracker.owner.displayName
        this.prevalence = tdsStorage.tds.entities[t.tracker.owner.name].prevalence
        this.urls = {}
        this.urls[t.fullTrackerDomain] = {
            isBlocked: this.isBlocked(t.action),
            reason: t.reason,
            categories: t.tracker.categories
        }
        this.count = 1 // request count
        this.type = t.type || ''
    }

    increment () {
        this.count += 1
    }

    /* A parent company may try
     * to track you through many different entities.
     * We store a list of all unique urls here.
     */
    update (t) {
        if (!this.urls[t.fullTrackerDomain]) {
            this.urls[t.fullTrackerDomain] = {
                isBlocked: this.isBlocked(t.action),
                reason: t.reason,
                categories: t.tracker.categories
            }
        }
    }

    isBlocked (action) {
        return !!action.match(/block|redirect/)
    }
}
