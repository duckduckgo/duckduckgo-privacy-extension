const Companies = require('../companies.es6')

class Tracker {
    constructor (t) {
        this.parentCompany = Companies.get(t.tracker.owner.name)
        this.urls = {}
        this.urls[t.tracker.domain] = {
            isBlocked: t.action === 'block' ? true : false, 
            reason: t.reason
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
        if (!this.urls[t.tracker.domain]) {
            this.urls[t.tracker.domain] = {isBlocked: t.action, reason: t.reason}
        }
    }
}

module.exports = Tracker
