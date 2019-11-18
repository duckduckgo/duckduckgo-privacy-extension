const tldts = require('tldts')
const tosdr = require('../../data/tosdr')
const constants = require('../../data/constants')
const utils = require('./utils.es6')

const tosdrRegexList = []
const tosdrScores = {}

class PrivacyPractices {
    constructor () {
        Object.keys(tosdr).forEach((site) => {
            // only match domains, and from the start of the URL
            tosdrRegexList.push(new RegExp(`(^)${tldts.getDomain(site)}`))

            // generate scores for the privacy grade
            const tosdrClass = tosdr[site].class
            const tosdrScore = tosdr[site].score

            if (tosdrClass || tosdrScore) {
                let score = 5

                // asign a score value to the classes/scores provided in the JSON file
                if (tosdrClass === 'A') {
                    score = 0
                } else if (tosdrClass === 'B') {
                    score = 1
                } else if (tosdrClass === 'D' || tosdrScore > 150) {
                    score = 10
                } else if (tosdrClass === 'C' || tosdrScore > 100) {
                    score = 7
                }

                tosdrScores[site] = score

                // if the site has a parent entity, propagate the score to that, too
                // but only if the score is higher
                //
                // basically, a parent entity's privacy score is as bad as
                // that of the worst site it owns
                const parentEntity = utils.findParent(site)

                if (parentEntity && (!tosdrScores[parentEntity] || tosdrScores[parentEntity] < score)) {
                    tosdrScores[parentEntity] = score
                }
            }
        })
    }

    getTosdr (url) {
        let domain = tldts.getDomain(url)
        let tosdrData

        tosdrRegexList.some(tosdrSite => {
            let match = tosdrSite.exec(domain)

            if (!match) return

            tosdrData = tosdr[match[0]]

            return tosdrData
        })

        if (!tosdrData) return {}

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
            } else if (tosdrData.score > 0) {
                message = constants.tosdrMessages.bad
            }
        }

        return {
            score: tosdrData.score,
            class: tosdrData.class,
            reasons: {
                good: matchGood,
                bad: matchBad
            },
            message: message
        }
    }

    getTosdrScore (hostname, parent) {
        const domain = tldts.getDomain(hostname)

        // look for tosdr match in list of parent properties
        let parentMatch = ''
        if (parent && parent.domains) {
            Object.keys(tosdrScores).some((tosdrName) => {
                const match = parent.domains.find(d => d === tosdrName)
                if (match) {
                    parentMatch = match
                    return true
                }
            })
        }

        // grab the first available val
        // starting with most general first

        // minor potential for an edge case:
        // foo.bar.com and bar.com have entries in tosdr.json
        // and different scores - should they propagate
        // the same way parent entity ones do?
        const score = [
            tosdrScores[parentMatch],
            tosdrScores[domain],
            tosdrScores[hostname]
        ].find(s => typeof s === 'number')

        return score
    }
}

module.exports = new PrivacyPractices()
