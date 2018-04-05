const tldjs = require('tldjs')
const tosdr = require('../../../data/tosdr')
const constants = require('../../../data/constants')
const utils = require('../utils.es6')
const tosdrRegexList = Object.keys(tosdr).map(x => new RegExp(`(^)${tldjs.getDomain(x)}`))
const tosdrClassMap = {'A': -1, 'B': 0, 'C': 0, 'D': 1, 'E': 2} // map tosdr class rankings to increase/decrease in grade
const siteScores = ['A', 'B', 'C', 'D']
const pagesSeenOn = constants.majorTrackingNetworks
const pagesSeenOnRegexList = Object.keys(pagesSeenOn).map(x => new RegExp(`${x}\\.`))

class Score {

    constructor(specialPage, domain) {
        this.specialPage = specialPage     // see specialDomain() in class Site below
        this.hasHTTPS = false
        this.inMajorTrackingNetwork = false
        this.totalBlocked = 0
        this.hasObscureTracker = false
        this.domain = domain
        this.isaMajorTrackingNetwork = this.isaMajorTrackingNetwork()
        this.tosdr = this.getTosdr()
    }

    getTosdr() {
        let result = {}

        tosdrRegexList.some(tosdrSite => {
            let match = tosdrSite.exec(this.domain)
            if (match) {
                // remove period at end for lookup in pagesSeenOn
                let tosdrData = tosdr[match[0]]

                if (!tosdrData) return

                const matchGood = (tosdrData.match && tosdrData.match.good) || []
                const matchBad = (tosdrData.match && tosdrData.match.bad) || []

                // tosdr message
                // 1. If we have a defined tosdr class look up the message in constants
                //    for the corresponding letter class
                // 2. If there are both good and bad points -> 'mixed'
                // 3. Else use the calculated tosdr score to determine the message
                let message = constants.tosdrMessages.unknown
                if (tosdrData.class) {
                    message = constants.tosdrMessages[tosdrData.class]
                } else if (matchGood.length && matchBad.length) {
                    message = constants.tosdrMessages.mixed
                } else {
                    if (tosdrData.score < 0) {
                        message = constants.tosdrMessages.good
                    } else if (tosdrData.score === 0 && (matchGood.length || matchBad.length)) {
                        message = constants.tosdrMessages.mixed
                    } else if (tosdrData.score > 0 ) {
                        message = constants.tosdrMessages.bad
                    }
                }

                return result = {
                    score: tosdrData.score,
                    class: tosdrData.class,
                    reasons: {
                        good: matchGood,
                        bad: matchBad
                    },
                    message: message
                }
            }
        })
        return result
    }

    /* is the parent site itself a major tracking network?
     * minus one grade for each 10% of the top pages this
     * network is found on.
     */
    isaMajorTrackingNetwork() {
        let result = 0
        if (this.specialPage || !this.domain) return result
        const parentCompany = utils.findParent(this.domain.split('.'))
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
    get() {
        if (this.specialPage) return {}

        let beforeIndex = 1
        let afterIndex = 1

        if (this.isaMajorTrackingNetwork) {
            beforeIndex += this.isaMajorTrackingNetwork
            afterIndex += this.isaMajorTrackingNetwork
        }

        // If tosdr already determined a class ranking then we map that to increase or
        // decrease the grade accordingly. Otherwise we apply a +/- to the grade based
        // on the cumulative total of all the points we care about. see: scripts/tosdr-topics.json
        if (this.tosdr) {
            if (this.tosdr.class) {
                beforeIndex += tosdrClassMap[this.tosdr.class]
                afterIndex += tosdrClassMap[this.tosdr.class]

            } else if (this.tosdr.score) {
                let tosdrScore =  Math.sign(this.tosdr.score)
                beforeIndex += tosdrScore
                afterIndex += tosdrScore
            }
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
        if(afterIndex === 0 && this.tosdr.class !== 'A') afterIndex = 1
        if(beforeIndex === 0 && this.tosdr.class !== 'A') beforeIndex = 1

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
    update(event) {

        let majorTrackingNetworks = constants.majorTrackingNetworks
        let IPRegex = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/

        if (event.hasHTTPS) {
            this.hasHTTPS = true
        }
        else if (event.trackerBlocked) {

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
