const utils = require('../utils')

const tosdr = require('../../data/generated/tosdr')
const tosdrMessages = require('../../data/tosdr-messages')
const majorTrackingNetworks = require('../../data/major-tracking-networks')

const tosdrRegexList = Object.keys(tosdr).map(x => new RegExp(`(^)${utils.getDomain(x)}`)) // only match domains, and from the start of the URL
const tosdrClassMap = {'A': -1, 'B': 0, 'C': 0, 'D': 1, 'E': 2} // map tosdr class rankings to increase/decrease in grade
const siteScores = ['A', 'B', 'C', 'D']

class Grade {
    constructor(domain, specialPage) {
        this.specialPage = specialPage     // see specialDomain() in class Site below
        this.hasHTTPS = false
        this.inMajorTrackingNetwork = false
        this.totalBlocked = 0
        this.decisions = []
        this.hasObscureTracker = false
        this.domain = utils.getDomain(domain) // strip the subdomain. Fixes matching tosdr for eg encrypted.google.com
        this.isaMajorTrackingNetwork = this.isaMajorTrackingNetwork()
        this.tosdr = this.getTosdr()
        this.trackersByUrl = {}
    }

    getTosdr() {
        let result = {}

        tosdrRegexList.some(tosdrSite => {
            let match = tosdrSite.exec(this.domain)
            if (match) {
                // remove period at end for lookup in majorTrackingNetworks
                let tosdrData = tosdr[match[0]]

                if (!tosdrData) return

                const matchGood = (tosdrData.match && tosdrData.match.good) || []
                const matchBad = (tosdrData.match && tosdrData.match.bad) || []

                // tosdr message
                // 1. If we have a defined tosdr class look up the tosdr message
                //    for the corresponding letter class
                // 2. If there are both good and bad points -> 'mixed'
                // 3. Else use the calculated tosdr score to determine the message
                let message = tosdrMessages.unknown
                if (tosdrData.class) {
                    message = tosdrMessages[tosdrData.class]
                } else if (matchGood.length && matchBad.length) {
                    message = tosdrMessages.mixed
                } else {
                    if (tosdrData.score < 0) {
                        message = tosdrMessages.good
                    } else if (tosdrData.score === 0 && (matchGood.length || matchBad.length)) {
                        message = tosdrMessages.mixed
                    } else if (tosdrData.score > 0 ) {
                        message = tosdrMessages.bad
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
        const isMajorNetwork = majorTrackingNetworks[parentCompany.toLowerCase()]
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

        this.decisions = []

        let beforeIndex = 1
        let afterIndex = 1

        this.addDecision({change: 1, index: beforeIndex, why: "Default grade"})

        if (this.isaMajorTrackingNetwork) {
            beforeIndex += this.isaMajorTrackingNetwork
            afterIndex += this.isaMajorTrackingNetwork
            this.addDecision({
                change: this.isaMajorTrackingNetwork,
                index: beforeIndex,
                why: "Is a major tracking network"
            })
        } else {
            this.addDecision({ change: 0, index: beforeIndex, why: "Not a major tracking network" })
        }

        // If tosdr already determined a class ranking then we map that to increase or
        // decrease the grade accordingly. Otherwise we apply a +/- to the grade based
        // on the cumulative total of all the points we care about. see: scripts/tosdr-topics.json
        if (this.tosdr) {
            if (this.tosdr.class) {
                beforeIndex += tosdrClassMap[this.tosdr.class]
                afterIndex += tosdrClassMap[this.tosdr.class]

                this.addDecision({
                    change: tosdrClassMap[this.tosdr.class],
                    index: beforeIndex,
                    why: `Has tosdr class ${this.tosdr.class}`,
                    tosdr: this.tosdr
                })

            } else if (this.tosdr.score) {
                let tosdrScore =  Math.sign(this.tosdr.score)
                beforeIndex += tosdrScore
                afterIndex += tosdrScore

                this.addDecision({
                    change: tosdrScore,
                    index: beforeIndex,
                    why: `Has tosdr score ${tosdrScore}`,
                    tosdr: this.tosdr
                })
            } else {
                this.addDecision({ change: 0, index: beforeIndex, why: `No tosdr` })
            }
        }

        if (this.inMajorTrackingNetwork) {
            beforeIndex++
            this.addDecision({ change: 1, index: beforeIndex, why: `In major tracking network` })
        } else {
            this.addDecision({ change: 0, index: beforeIndex, why: `Not in major tracking network` })
        }

        if (!this.hasHTTPS) {
            beforeIndex++
            afterIndex++
            this.addDecision({ change: 1, index: beforeIndex, why: `No HTTPS` })
        } else {
            this.addDecision({ change: 0, index: beforeIndex, why: `Has HTTPS` })
        }

        if (this.hasObscureTracker) {
            beforeIndex++
            this.addDecision({ change: 1, index: beforeIndex, why: `Has obscure tracker` })
        } else {
            this.addDecision({ change: 0, index: beforeIndex, why: `No obscure tracker` })
        }

        // decrease score for every 10, round up
        let trackerPenalty = Math.ceil(this.totalBlocked / 10)
        beforeIndex += trackerPenalty

        this.addDecision({ change: trackerPenalty, index: beforeIndex, why: `${this.totalBlocked} trackers blocked` })

        // negative scoreIndex should return the highest score
        if (beforeIndex < 0) {
            let diff = 0 - beforeIndex
            beforeIndex = 0
            this.addDecision({
                change: diff,
                index: beforeIndex,
                why: `Don't allow negative score`
            })
        }
        if (afterIndex < 0) afterIndex = 0

        // only sites with a tosdr.class "A" can get a final grade of "A"
        if(afterIndex === 0 && this.tosdr.class !== 'A') afterIndex = 1
        if(beforeIndex === 0 && this.tosdr.class !== 'A') {
            beforeIndex = 1

            this.addDecision({
                change: 1,
                index: beforeIndex,
                why: `Grade 'A' requires TOSDR class 'A'. this.tosdr.class: ${this.tosdr.class}`
            })
        }

        // return corresponding score or lowest score if outside the array
        let beforeGrade = siteScores[beforeIndex] || siteScores[siteScores.length - 1]
        let afterGrade = siteScores[afterIndex] || siteScores[siteScores.length - 1]

        this.addDecision({
            change: 0,
            index: beforeIndex,
            why: `final grade ${beforeGrade}`
        })

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
        let IPRegex = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/

        if (event.hasHTTPS) {
            this.hasHTTPS = true
        }
        else if (event.trackerBlocked) {
            let tracker = event.trackerBlocked
            if (this.trackersByUrl[tracker.url]) { return }

            this.trackersByUrl[tracker.url] = true

            // tracker is from one of the top blocked companies
            if (majorTrackingNetworks[tracker.parentCompany.toLowerCase()]) {
                this.inMajorTrackingNetwork = true
            }

            // trackers with IP address
            if (tracker.url.match(IPRegex)) {
                this.hasObscureTracker = true
            }

            this.totalBlocked++
        }
    }

    addDecision(decision) {
        decision.grade = siteScores[decision.index] || 'D'
        this.decisions.push(decision)
    }
}

module.exports = Grade
