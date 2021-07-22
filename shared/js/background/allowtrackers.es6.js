const tdsStorage = require('./storage/tds.es6')
const utils = require('./utils.es6')
const trackers = require('./trackers.es6')

function isTrackerAllowlisted (site, request) {
    if (!tdsStorage.config.features.contentBlocking.trackerAllowlist
        && !Object.keys(tdsStorage.config.features.contentBlocking.trackerAllowlist).length) {
        return false
    }

    const allowListEntry = _findAllowlistEntry(request, tdsStorage.config.features.contentBlocking.trackerAllowlist)

    if (allowListEntry) {
        return _matchesRule(site, request, allowListEntry)
    } else {
        return false
    }
}

function _findAllowlistEntry (request, allowList) {
    const host = utils.extractHostFromURL(request).split('.') 
    const urlList = Array.from(host)

    while (urlList.length > 1) {
        const requestDomain = urlList.join('.')
        urlList.shift()

        const matchedTracker = allowList[requestDomain]
        if (matchedTracker) {
            return matchedTracker
        }
    }
}

function _matchesRule (site, request, allowListEntry) {
    let matchedRule = null
    if (allowListEntry.rules && allowListEntry.rules.length) {
        allowListEntry.rules.some(ruleObj => {
            if (request.match(ruleObj.rule)) {
                matchedRule = ruleObj
                return true
            }
        })
    }

    if (matchedRule) {
        if (matchedRule.domains.includes('<all>') || matchedRule.domains.includes(utils.extractHostFromURL(utils.extractLimitedDomainFromURL(site)))) {
            return matchedRule
        }
    } else {
        return false
    }
}

module.exports = isTrackerAllowlisted
