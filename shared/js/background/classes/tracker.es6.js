const Companies = require('../companies.es6')

class Tracker {
    constructor (name, url, type) {
        this.parentCompany = Companies.get(name)
        this.urls = [url]
        this.count = 1 // request count
        this.type = type || ''
    }

    increment () {
        this.count += 1
    }

    /* A parent company may try
     * to track you through many different entities.
     * We store a list of all unique urls here.
     */
    addURL (url) {
        if (this.urls.indexOf(url) === -1) {
            this.urls.push(url)
        }
    }
}

module.exports = Tracker
