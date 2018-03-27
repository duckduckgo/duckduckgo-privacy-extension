const Companies = require('../companies.es6')

class Tracker {
    constructor (t) {
        this.parentCompany = Companies.get(t.parentCompany)
        this.urls = {}
        this.urls[t.url] = {isBlocked: t.block, reason: t.reason}
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
        if (!this.urls[t.url]) {
            this.urls[t.url] = {isBlocked: t.block, reason: t.reason}
        }
    }
}

module.exports = Tracker
