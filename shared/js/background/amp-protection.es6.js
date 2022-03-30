const Site = require('./classes/site.es6')
const tdsStorage = require('./storage/tds.es6')
const utils = require('./utils.es6')

let ampSettings = null

const featureName = 'ampLinks'

/**
 * Ensure the config has the ampLinks feature and its settings
 *
 * @returns {boolean} - true if the config is loaded
 */
function ensureConfig () {
    if (ampSettings) {
        return true
    }

    if (!tdsStorage.config ||
        !tdsStorage.config.features ||
        !tdsStorage.config.features.ampLinks ||
        !tdsStorage.config.features.ampLinks.settings ||
        !tdsStorage.config.features.ampLinks.settings.linkFormats ||
        !tdsStorage.config.features.ampLinks.settings.keywords) {
        return false
    }

    ampSettings = tdsStorage.config.features.ampLinks.settings

    return true
}

/**
 * This method checks if the given url is a Google hosted AMP url and resturns the canonical url if it is.
 *
 * @param {Site} site - the initiating site
 * @param {string} url - the url being loaded
 * @returns canonical url if found, null otherwise
 */
function extractAMPURL (site, url) {
    if (!ensureConfig()) {
        return null
    }

    if (site.specialDomainName || !site.isFeatureEnabled(featureName)) {
        return null
    }

    for (const regexPattern of ampSettings.linkFormats) {
        const match = url.match(regexPattern)
        if (match && match.length > 1) {
            const newSite = new Site(match[1].startsWith('http') ? match[1] : `https://${match[1]}`)

            if (newSite.specialDomainName || !newSite.isFeatureEnabled(featureName)) {
                return null
            }

            return newSite.url
        }
    }

    return null
}

/**
 * Check if the given request is a suspected 1st party AMP URL. If it is, then we will attempt to fetch the canonical URL
 *
 * @param {object} requestData - request data
 * @param {object} thisTab - current tab
 * @param {object} mainFrameRequestURL - main frame request url
 * @returns true if the request is a suspected 1st party AMP url
 */
function tabNeedsDeepExtraction (requestData, thisTab, mainFrameRequestURL) {
    if (utils.getBrowserName() !== 'moz') {
        // deep extraction is only supported on Firefox
        return false
    }

    if (requestIsExtension(requestData)) {
        return false
    }

    if (thisTab.ampUrl && thisTab.ampUrl === mainFrameRequestURL.href) {
        return false
    }

    return isAMPURL(mainFrameRequestURL.href)
}

/**
 * This method checks if the given url is a 1st party AMP url
 *
 * @param {string} url - the url being loaded
 * @returns true is the url is suspected to be a 1st party AMP url
 */
function isAMPURL (url) {
    if (!ensureConfig()) {
        return false
    }

    const site = new Site(url)
    if (site.specialDomainName || !site.isFeatureEnabled(featureName)) {
        return false
    }

    return ampSettings.keywords.some(keyword => url.includes(keyword))
}

/**
 * This async method will fetch the DOM content of a suspected 1st party AMP URL and will
 * return the canonical URL if one is found.
 *
 * @param {Site} site - the initiating site
 * @param {string} url - the url being loaded
 * @returns cancalon url if found, null otherwise
 */
async function fetchAMPURL (site, url) {
    if (!ensureConfig()) {
        return null
    }

    if (site.specialDomainName || !site.isFeatureEnabled(featureName) || site.url === 'about:blank') {
        return null
    }

    let data = null
    const timeoutController = new AbortController()
    setTimeout(() => timeoutController.abort(), 5000)

    try {
        data = await fetch(url, { signal: timeoutController.signal })
    } catch (e) {
        console.error(e)
        return null
    }

    if (!data) {
        return null
    }

    const text = await data.text()
    if (!text) {
        return null
    }

    const doc = new DOMParser().parseFromString(text, 'text/html')
    const errorNode = doc.querySelector('parsererror')
    if (errorNode) {
        // DOMNParser failed to parse the document
        return null
    }

    const canonicalLinks = doc.querySelectorAll('[rel="canonical"]')

    if (canonicalLinks.length > 0) {
        const newSite = new Site(canonicalLinks[0].href)

        if (newSite.specialDomainName || !newSite.isFeatureEnabled(featureName)) {
            return null
        }

        return canonicalLinks[0].href
    }

    return null
}

/**
 * This method is the same as fetchAMPURL but will return a promise that will resolve to the canonical URL if one is found.
 * This should only be used on Firefox
 *
 * @param {object} tabManager - current tab manager instance
 * @param {object} thisTab - current tab
 * @param {string} url - url being loaded
 * @returns promise that resolves to the canonical URL if one is found
 */
async function fetchAMPURLMoz (tabManager, thisTab, url) {
    const canonUrl = await fetchAMPURL(thisTab.site, url)

    const currentTab = tabManager.get({ tabId: thisTab.id })
    if (currentTab) {
        // Set clean url to the canonical url or the original url if no canonical url is found
        currentTab.cleanAmpUrl = canonUrl || url
    }

    if (canonUrl) {
        return { redirectUrl: canonUrl }
    }
}

/**
 * Check if the given request was initiated by the extension. On Chrome extension initiated requests
 * will cause a crash if we try to use fetch on their thread.
 *
 * @param {object} request - request object
 * @returns true if the request was initiated by an extension
 */
function requestIsExtension (request) {
    return request.initiator && request.initiator.startsWith('chrome-extension://')
}

tdsStorage.onUpdate('config', () => {
    ampSettings = null
})

module.exports = {
    isAMPURL,
    extractAMPURL,
    fetchAMPURL,
    tabNeedsDeepExtraction,
    fetchAMPURLMoz
}
