const tldjs = require('tldjs')
const tosdr = require('../../data/tosdr')
const constants = require('../../data/constants')
const utils = require('./utils.es6')

// only match domains, and from the start of the URL
const tosdrRegexList = Object.keys(tosdr).map(x => new RegExp(`(^)${tldjs.getDomain(x)}`))

class PrivacyPolicy {
    getTosdr (url) {
        let domain = tldjs.getDomain(url)
        let result = {}

        tosdrRegexList.some(tosdrSite => {
            let match = tosdrSite.exec(domain)
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
                    } else if (tosdrData.score > 0) {
                        message = constants.tosdrMessages.bad
                    }
                }

                result = {
                    score: tosdrData.score,
                    class: tosdrData.class,
                    reasons: {
                        good: matchGood,
                        bad: matchBad
                    },
                    message: message
                }

                return result
            }
        })
        return result
    }
}

module.exports = new PrivacyPolicy()
