const tdsStorage = require('./storage/tds').default;
const tldts = require('tldts');
const { getURLWithoutQueryString } = require('./utils');

/**
 * @typedef {Object} TrackerAllowlistRule
 * @property {string} rule
 * @property {string[]} domains
 * @property {string} [reason]
 *
 * @typedef {Object} TrackerAllowlistDomainEntry
 * @property {TrackerAllowlistRule[]} rules
 *
 * @typedef {Record<string, TrackerAllowlistDomainEntry>} TrackerAllowlist
 */

/**
 * Check a request against the tracker allowlist.
 * @param {string} site URL of the site
 * @param {string} request URL to be checked against the allowlist
 * @returns {TrackerAllowlistRule | false}
 */
function isTrackerAllowlisted(site, request) {
    // check that allowlist exists and is not disabled
    if (!tdsStorage.config.features.trackerAllowlist || tdsStorage.config.features.trackerAllowlist.state === 'disabled') {
        return false;
    }

    // check that allowlist has entries
    if (
        !tdsStorage.config.features.trackerAllowlist.settings ||
        !Object.keys(tdsStorage.config.features.trackerAllowlist.settings.allowlistedTrackers).length
    ) {
        return false;
    }

    const parsedRequest = tldts.parse(request);
    if (!parsedRequest.domain) {
        return false;
    }
    /** @type {TrackerAllowlist} */
    const trackerAllowlist = tdsStorage.config.features.trackerAllowlist.settings.allowlistedTrackers;
    const allowListEntry = trackerAllowlist[parsedRequest.domain];

    if (allowListEntry) {
        return _matchesRule(site, request, allowListEntry);
    } else {
        return false;
    }
}

/**
 * @param {string} site
 * @param {string} request
 * @param {TrackerAllowlistDomainEntry} allowListEntry
 * @returns {TrackerAllowlistRule | false}
 */
function _matchesRule(site, request, allowListEntry) {
    let matchedRule = null;
    request = getURLWithoutQueryString(request).split(';')[0];

    // remove port from request urls
    const parsedRequest = new URL(request);
    if (parsedRequest.port) {
        parsedRequest.port = parsedRequest.protocol === 'https:' ? '443' : '80';
        request = parsedRequest.href;
    }

    if (allowListEntry.rules && allowListEntry.rules.length) {
        for (const ruleObj of allowListEntry.rules) {
            if (request.match(ruleObj.rule)) {
                matchedRule = ruleObj;
                break;
            }
        }
    }

    if (matchedRule) {
        if (matchedRule.domains.includes('<all>')) {
            return matchedRule;
        }
        const { domain, hostname } = tldts.parse(site);
        // eTLD+1 match
        if (domain && matchedRule.domains.includes(domain)) {
            return matchedRule;
        }
        // hostname, or hostname-suffix match
        if (hostname && matchedRule.domains.find((d) => d === hostname || hostname.endsWith(`.${d}`))) {
            return matchedRule;
        }
    } else {
        return false;
    }

    return false;
}

module.exports = isTrackerAllowlisted;
