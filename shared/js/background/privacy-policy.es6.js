const tldjs = require('tldjs')
const tosdr = require('../../data/tosdr')
const constants = require('../../data/constants')
const utils = require('./utils.es6')

const hibpArray = require('../../data/breaches')
const hibp = {}
const hibpRegexList = []

hibpArray.forEach(x => {
    hibp[x.Domain] = x
    hibpRegexList.push(new RegExp(`(^)${tldjs.getDomain(x.Domain)}`))
})

const ONE_WEEK = 1000 * 60 * 60 * 24 * 7
const ONE_MONTH = ONE_WEEK * 30 // close enough
const SIX_MONTHS = ONE_MONTH * 6

// only match domains, and from the start of the URL
const tosdrRegexList = Object.keys(tosdr).map(x => new RegExp(`(^)${tldjs.getDomain(x)}`))

class PrivacyPolicy {
    getTosdrData (url) {
        let domain = tldjs.getDomain(url)
        let data

        tosdrRegexList.some(tosdrSite => {
            let match = tosdrSite.exec(domain)

            if (!match) return

            data = tosdr[match[0]]

            return data
        })

        return data
    }

    getTosdr (url) {
        const tosdrData = this.getTosdrData(url)

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

    getTosdrScore (url) {
        let tosdrData = this.getTosdrData(url)

        if (!tosdrData) return

        if (!tosdrData.class && !tosdrData.score) return

        let score = 5

        if (tosdrData.class === 'A') {
            score = 0
        } else if (tosdrData.class === 'B') {
            score = 1
        } else if (tosdrData.class === 'D' || tosdrData.score > 150) {
            score = 10
        } else if (tosdrData.class === 'C' || tosdrData.score > 100) {
            score = 7
        }

        return score
    }

    getHibp (url) {
        let domain = tldjs.getDomain(url)
        let data

        hibpRegexList.some(site => {
            let match = site.exec(domain)

            if (!match) return

            data = hibp[match[0]]

            return data
        })

        if (!data) return

        // we don't care about those
        if (data.IsSpamList ||
                data.IsFabricated ||
                data.IsRetired ||
                !data.IsActive) {
            return
        }

        // how worried should the user be?
        let urgency = 0

        let discoveredAge = Date.now() - new Date(data.AddedDate).getTime()

        if (discoveredAge < ONE_WEEK) {
            urgency += 10
            data.recent = true
        } else if (discoveredAge < ONE_MONTH) {
            urgency += 5
            data.recent = true
        } else if (discoveredAge < SIX_MONTHS) {
            urgency += 2
        }

        if (data.IsSensitive) {
            urgency += 3
        }

        if (data.Description.match(/plain text/)) {
            urgency += 5
        }

        if (data.PwnCount > 1000000) {
            data.major = true
        }

        // this is not good but OK
        urgency += data.DataClasses.length

        data.urgency = urgency

        return data
    }
}

module.exports = new PrivacyPolicy()
