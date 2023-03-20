/** @module tds */

const {
    generateDNRRule
} = require('./utils')

const AMP_PROTECTION_PRIORITY = 40000

/**
 * @typedef generateAmpProtectionRulesResult
 * @property {import('./utils').DNRRule} rule
 * @property {object} matchDetails
 */

/**
 * Function to produce the declarativeNetRequest rules and corresponding match
 * details for the given trackerAllowlist configuration.
 * @param {object} extensionConfiguration
 *   The extension configuration.
 * @param {function} isRegexSupported
 *   A function compatible with chrome.declarativeNetRequest.isRegexSupported.
 *   See https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/#method-isRegexSupported
 * @return {Promise<generateAmpProtectionRulesResult[]>}
 */
async function generateAmpProtectionRules ({ features: { ampLinks } }, isRegexSupported) {
    const results = []

    if (!ampLinks ||
        ampLinks.state !== 'enabled' ||
        !ampLinks.settings ||
        !ampLinks.settings.linkFormats ||
        ampLinks.settings.linkFormats.length === 0) {
        return results
    }

    const { settings: { linkFormats: ampLinkRegexps } } = ampLinks
    const excludedDomains =
        (ampLinks?.exceptions || []).map(({ domain }) => domain)

    for (const ampLinkRegex of ampLinkRegexps) {
        // It seems that \S (non-whitespace character class) is not always
        // matched correctly. Luckily whitespace in URLs should be encoded
        // anyway, so let's match . (any character) instead.
        // TODO: Figure out minimal test case and file a Chromium bug.
        const regexFilter = ampLinkRegex.replaceAll('\\S', '.')

        const { isSupported } = await isRegexSupported({
            regex: regexFilter,
            isCaseSensitive: false,
            requireCapturing: true
        })
        if (!isSupported) {
            continue
        }

        const rule = generateDNRRule({
            priority: AMP_PROTECTION_PRIORITY,
            actionType: 'redirect',
            regexFilter,
            redirect: { regexSubstitution: 'https://\\1' },
            resourceTypes: ['main_frame'],
            excludedInitiatorDomains: excludedDomains,
            excludedRequestDomains: excludedDomains
        })
        const matchDetails = {
            type: 'ampProtection'
        }
        results.push({ rule, matchDetails })
    }

    return results
}

exports.AMP_PROTECTION_PRIORITY = AMP_PROTECTION_PRIORITY
exports.generateAmpProtectionRules = generateAmpProtectionRules
