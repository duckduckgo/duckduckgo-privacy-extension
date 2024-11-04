const Site = require('./classes/site').default
const tdsStorage = require('./storage/tds').default

/** @module */

// Note: These lists of parameters would need to be stored in session storage if
//       this code was used by MV3 builds of the extension.
//       See https://developer.chrome.com/docs/extensions/mv3/migrating_to_service_workers/#state
let trackingParameters = null

function ensureTrackingParametersConfig() {
    if (trackingParameters) {
        return true
    }

    if (!tdsStorage?.config?.features?.trackingParameters?.settings?.parameters) {
        return false
    }

    trackingParameters = new Set(tdsStorage.config.features.trackingParameters.settings.parameters)

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
function stripTrackingParameters(url) {
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

    // Remove tracking parameters
    // Note: We can't use url.searchParams here because adding/removing parameters
    //            with URLSearchParams adjusts the encoding of the other parameters.
    //            See https://url.spec.whatwg.org/#urlsearchparams
    //
    // percent encoded parameters.
    const params = url.search.slice(1).split('&')
    const paramsToKeep = []
    for (const param of params) {
        if (trackingParameters.has(param.split('=')[0])) {
            parametersRemoved = true
            continue
        }

        paramsToKeep.push(param)
    }
    url.search = paramsToKeep.length === 0 ? '' : '?' + paramsToKeep.join('&')

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
function trackingParametersStrippingEnabled(site, initiatorUrl) {
    // Only strip tracking parameters if the feature is enabled for the
    // request URL (URL that the user is navigating to).
    if (site.specialDomainName || !site.isFeatureEnabled('trackingParameters')) {
        return false
    }

    // Also only strip tracking parameters if the feature is enabled for
    // the initiating URL (the URL that the user navigated from, if any).
    if (initiatorUrl) {
        const initiatorSite = new Site(initiatorUrl)
        if (initiatorSite.specialDomainName || !initiatorSite.isFeatureEnabled('trackingParameters')) {
            return false
        }
    }

    return true
}

tdsStorage.onUpdate('config', () => {
    trackingParameters = null
})

module.exports = {
    trackingParametersStrippingEnabled,
    stripTrackingParameters,
}
