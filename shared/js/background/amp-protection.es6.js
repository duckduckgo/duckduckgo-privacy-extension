const Site = require('./classes/site.es6')
const tdsStorage = require('./storage/tds.es6')

let regexPatterns = null
let keywords = null

let lastAmpUrl = null

const featureName = 'ampLinks'

/**
 * Ensure the config has the ampLinks feature and its settings
 *
 * @returns {boolean} - true if the config is loaded
 */
function ensureConfig () {
    if (regexPatterns && keywords) {
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

    regexPatterns = tdsStorage.config.features.ampLinks.settings.linkFormats
    keywords = tdsStorage.config.features.ampLinks.settings.keywords

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

    for (const regexPattern of regexPatterns) {
        const match = url.match(regexPattern)
        if (match && match.length > 1) {
            const newSite = new Site(match[1].startsWith('http') ? match[1] : `http://${match[1]}`)

            if (newSite.specialDomainName || !newSite.isFeatureEnabled(featureName)) {
                return null
            }

            return newSite.url
        }
    }

    return null
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

    return keywords.some(keyword => url.includes(keyword))
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

    if (site.specialDomainName || !site.isFeatureEnabled(featureName)) {
        return null
    }

    lastAmpUrl = url

    const data = await fetch(url)
    const text = await data.text()
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

function getLastAmpUrl () {
    return lastAmpUrl
}

function resetLastAmpUrl () {
    lastAmpUrl = null
}

tdsStorage.onUpdate('config', () => {
    regexPatterns = null
    keywords = null
})

module.exports = {
    isAMPURL,
    extractAMPURL,
    fetchAMPURL,
    getLastAmpUrl,
    resetLastAmpUrl
}
