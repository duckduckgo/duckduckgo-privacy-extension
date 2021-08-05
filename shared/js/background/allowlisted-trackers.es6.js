const tdsStorage = require('./storage/tds.es6')
const tldts = require('tldts')

function isTrackerAllowlisted (site, request) {
    // check that allowlist exists and is not disabled
    if (!tdsStorage.config.features.trackerAllowlist || tdsStorage.config.features.trackerAllowlist.state === 'disabled') {
        return false
    }

    // check that allowlist has entries
    if (!tdsStorage.config.features.trackerAllowlist.settings &&
        !Object.keys(tdsStorage.config.features.trackerAllowlist.settings.allowlistedTrackers).length) {
        return false
    }

    const parsedRequest = tldts.parse(request)
    const allowListEntry = tdsStorage.config.features.trackerAllowlist.settings.allowlistedTrackers[parsedRequest.domain]

    if (allowListEntry) {
        return _matchesRule(site, request, allowListEntry)
    } else {
        return false
    }
}

function _matchesRule (site, request, allowListEntry) {
    let matchedRule = null
    request = request.split('?')[0].split(';')[0]

    // remove port from request urls
    const parsedRequest = new URL(request)
    if (parsedRequest.port) {
        request = request.replace(`:${parsedRequest.port}`, '')
    }

    if (allowListEntry.rules && allowListEntry.rules.length) {
        allowListEntry.rules.some(ruleObj => {
            if (request.match(ruleObj.rule)) {
                matchedRule = ruleObj
                return true
            } else {
                return false
            }
        })
    }

    if (matchedRule) {
        if (matchedRule.domains.includes('<all>') || matchedRule.domains.includes(tldts.parse(site).domain)) {
            return matchedRule
        }
    } else {
        return false
    }

    return false
}

module.exports = isTrackerAllowlisted
