const Site = require('./classes/site')
const tdsStorage = require('./storage/tds').default

/** @module */

// Tracking parameters listed in the configuration are sometimes to be treated
// as plain-text, but sometimes as regular expressions. The implementation guide
// dictates that tracking parameter should be treated as plain-text unless they
// contain one of the following characters: * + ? { } [ ]
const regexpParameterTest = /[*+?{}[\]]/

// Note: These lists of parameters would need to be stored in session storage if
//       this code was used by MV3 builds of the extension.
//       See https://developer.chrome.com/docs/extensions/mv3/migrating_to_service_workers/#state
let plainTextTrackingParameters = null
let regexpTrackingParameters = null

function ensureTrackingParametersConfig () {
    if (plainTextTrackingParameters && regexpTrackingParameters) {
        return true
    }

    if (!tdsStorage.config ||
        !tdsStorage.config.features ||
        !tdsStorage.config.features.trackingParameters ||
        !tdsStorage.config.features.trackingParameters.settings ||
        !tdsStorage.config.features.trackingParameters.settings.parameters) {
        return false
    }

    plainTextTrackingParameters = []
    regexpTrackingParameters = []
    for (const key of
        tdsStorage.config.features.trackingParameters.settings.parameters) {
        if (regexpParameterTest.test(key)) {
            regexpTrackingParameters.push(new RegExp(key))
        } else {
            plainTextTrackingParameters.push(key)
        }
    }

    return true
}

/**
 * Strip any known tracking GET parameters from the given URL. Return true if
 * any parameters were stripped, false otherwise.
 * @param {URL} url
 *   The request URL.
 *   Note: This is mutated to add parameters where necessary.
 * @returns {boolean}
 *   True if tracking parameters were stripped, false otherwise.
 */
function stripTrackingParameters (url) {
    let parametersRemoved = false

    // No parameters, nothing to remove.
    if (url.search.length <= 1) {
        return parametersRemoved
    }

    // Make sure that the tracking parameters configuration has been processed
    // since the extension config was last updated.
    if (!ensureTrackingParametersConfig()) {
        return parametersRemoved
    }

    // Remove any plain-text tracking parameters first, since they are cheaper
    // to remove.
    for (const key of plainTextTrackingParameters) {
        if (url.searchParams.has(key)) {
            url.searchParams.delete(key)
            parametersRemoved = true
        }
    }

    // No parameters left, nothing further to remove.
    if (url.search.length <= 1) {
        return parametersRemoved
    }

    // Remove any regular expression tracking parameters.
    // Note: This is potentially slow, in the future it might be worth
    //       optimising. For example, perhaps the minimum match lengths could
    //       be stored with the regular expression tracking parameters. That
    //       way, shorter keys could be skipped cheaply.
    for (const key of Array.from(url.searchParams.keys())) {
        for (const regexp of regexpTrackingParameters) {
            if (regexp.test(key)) {
                url.searchParams.delete(key)
                parametersRemoved = true
                break
            }
        }
    }

    return parametersRemoved
}

/**
 * Returns true if the 'trackingParameters' feature is active for the given site
 * and initiator URL.
 * @param {Site} site
 *   The Site Object for the request URL in question.
 * @param {string} [initiatorUrl]
 *   The initiator URL of the request (if any).
 * @returns {boolean}
 *   True if the 'trackingParameters' feature is active, false otherwise.
 */
function trackingParametersStrippingEnabled (site, initiatorUrl) {
    // Only strip tracking parameters if the feature is enabled for the
    // request URL (URL that the user is navigating to).
    if (site.specialDomainName || !site.isFeatureEnabled('trackingParameters')) {
        return false
    }

    // Also only strip tracking parameters if the feature is enabled for
    // the initiating URL (the URL that the user navigated from, if any).
    if (initiatorUrl) {
        const initiatorSite = new Site(initiatorUrl)
        if (initiatorSite.specialDomainName ||
            !initiatorSite.isFeatureEnabled('trackingParameters')) {
            return false
        }
    }

    return true
}

tdsStorage.onUpdate('config', () => {
    plainTextTrackingParameters = null
    regexpTrackingParameters = null
})

module.exports = {
    trackingParametersStrippingEnabled, stripTrackingParameters
}
