const tldjs = require('tldjs')
const constants = require('../../../data/constants')
const utils = require('../utils.es6')
const siteScores = ['A', 'B', 'C', 'D']
const pagesSeenOn = constants.majorTrackingNetworks

class Score {
    constructor (specialPage, domain) {
        this.specialPage = specialPage // see specialDomain() in class Site below
        this.hasHTTPS = false
        this.inMajorTrackingNetwork = false
        this.totalBlocked = 0
        this.hasObscureTracker = false
        this.domain = tldjs.getDomain(domain) // strip the subdomain. Fixes matching tosdr for eg encrypted.google.com
        this.isaMajorTrackingNetwork = this.isaMajorTrackingNetwork()
    }


    /* is the parent site itself a major tracking network?
     * minus one grade for each 10% of the top pages this
     * network is found on.
     */
    isaMajorTrackingNetwork () {
        let result = 0
        if (this.specialPage || !this.domain) return result
        const parentCompany = utils.findParent(this.domain)
        if (!parentCompany) return result
        const isMajorNetwork = pagesSeenOn[parentCompany.toLowerCase()]
        if (isMajorNetwork) {
            result = Math.ceil(isMajorNetwork / 10)
        }
        return result
    }

    /*
     * Calculates and returns a site score
     */
    get () {
        if (this.specialPage) return {}

        let beforeIndex = 1
        let afterIndex = 1

        if (this.isaMajorTrackingNetwork) {
            beforeIndex += this.isaMajorTrackingNetwork
            afterIndex += this.isaMajorTrackingNetwork
        }

        if (this.inMajorTrackingNetwork) beforeIndex++
        if (!this.hasHTTPS) {
            beforeIndex++
            afterIndex++
        }

        if (this.hasObscureTracker) beforeIndex++

        // decrease score for every 10, round up
        beforeIndex += Math.ceil(this.totalBlocked / 10)

        // negative scoreIndex should return the highest score
        if (beforeIndex < 0) beforeIndex = 0
        if (afterIndex < 0) afterIndex = 0

        // only sites with a tosdr.class "A" can get a final grade of "A"
        // if (afterIndex === 0 && this.tosdr.class !== 'A') afterIndex = 1
        // if (beforeIndex === 0 && this.tosdr.class !== 'A') beforeIndex = 1

        // return corresponding score or lowest score if outside the array
        let beforeGrade = siteScores[beforeIndex] || siteScores[siteScores.length - 1]
        let afterGrade = siteScores[afterIndex] || siteScores[siteScores.length - 1]

        return {
            before: beforeGrade,
            beforeIndex: beforeIndex,
            after: afterGrade,
            afterIndex: afterIndex
        }
    }

    /*
     * Update the score attruibues as new events come in. The actual
     * site score is calculated later when you call .get()
     */
    update (event) {
        let majorTrackingNetworks = constants.majorTrackingNetworks
        let IPRegex = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/

        if (event.hasHTTPS) {
            this.hasHTTPS = true
        } else if (event.trackerBlocked) {
            // tracker is from one of the top blocked companies
            if (majorTrackingNetworks[event.trackerBlocked.parentCompany]) {
                this.inMajorTrackingNetwork = true
            }

            // trackers with IP address
            if (event.trackerBlocked.url.match(IPRegex)) {
                this.hasObscureTracker = true
            }

            this.totalBlocked++
        }
    }
}

module.exports = Score
