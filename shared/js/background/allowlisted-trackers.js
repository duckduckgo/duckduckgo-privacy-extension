const tdsStorage = require('./storage/tds').default
const tldts = require('tldts')
const { getURLWithoutQueryString } = require('./utils')

function isTrackerAllowlisted (site, request) {
    // check that allowlist exists and is not disabled
    if (!tdsStorage.config.features.trackerAllowlist || tdsStorage.config.features.trackerAllowlist.state === 'disabled') {
        return false
    }

    // check that allowlist has entries
    if (!tdsStorage.config.features.trackerAllowlist.settings ||
        !Object.keys(tdsStorage.config.features.trackerAllowlist.settings.allowlistedTrackers).length) {
        return false
    }

    const parsedRequest = tldts.parse(request)
    if (!parsedRequest.domain) {
        return false
    }
    const allowListEntry = tdsStorage.config.features.trackerAllowlist.settings.allowlistedTrackers[parsedRequest.domain]

    if (allowListEntry) {
        return _matchesRule(site, request, allowListEntry)
    } else {
        return false
    }
}

function _matchesRule (site, request, allowListEntry) {
    let matchedRule = null
    request = getURLWithoutQueryString(request).split(';')[0]

    // remove port from request urls
    const parsedRequest = new URL(request)
    if (parsedRequest.port) {
        parsedRequest.port = parsedRequest.protocol === 'https:' ? '443' : '80'
        request = parsedRequest.href
    }

    if (allowListEntry.rules && allowListEntry.rules.length) {
        for (const ruleObj of allowListEntry.rules) {
            if (request.match(ruleObj.rule)) {
                matchedRule = ruleObj
                break
            }
        }
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
