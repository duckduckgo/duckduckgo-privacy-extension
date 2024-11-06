const Site = require('./classes/site').default;
const tdsStorage = require('./storage/tds').default;
const utils = require('./utils');

let ampSettings = null;

const featureName = 'ampLinks';

/**
 * Ensure the config has the ampLinks feature and its settings
 *
 * @returns {boolean} - true if the config is loaded
 */
function ensureConfig() {
    if (ampSettings) {
        return true;
    }

    if (
        !tdsStorage.config ||
        !tdsStorage.config.features ||
        !tdsStorage.config.features.ampLinks ||
        !tdsStorage.config.features.ampLinks.settings ||
        !tdsStorage.config.features.ampLinks.settings.linkFormats ||
        !tdsStorage.config.features.ampLinks.settings.keywords
    ) {
        return false;
    }

    ampSettings = tdsStorage.config.features.ampLinks.settings;

    return true;
}

/**
 * This function checks if the given url has an http(s) scheme
 * @param {string} url - the url to check
 * @returns true if the url is a valid http(s) url
 */
function isHttpUrl(url) {
    try {
        const newUrl = new URL(url);
        if (newUrl.protocol.startsWith('http')) {
            return true;
        }
    } catch {
        return false;
    }

    return false;
}

/**
 * This function checks if the given site is excluded from AMP protection
 * @param {Site} site - the site to check
 * @returns true if the site is excluded from AMP protection
 */
function isSiteExcluded(site) {
    if (site.specialDomainName || !site.isFeatureEnabled(featureName)) {
        return true;
    }

    return false;
}

/**
 * This method checks if the given url is a Google hosted AMP url and resturns the canonical url if it is.
 *
 * @param {Site} site - the initiating site
 * @param {string} url - the url being loaded
 * @returns canonical url if found, null otherwise
 */
function extractAMPURL(site, url) {
    if (!ensureConfig()) {
        return null;
    }

    if (site.specialDomainName || !site.isFeatureEnabled(featureName)) {
        return null;
    }

    for (const regexPattern of ampSettings.linkFormats) {
        const match = url.match(regexPattern);
        let needsScheme = false;
        if (match && match.length > 1) {
            const targetUrl = match[1];
            if (!isHttpUrl(targetUrl)) {
                try {
                    // eslint-disable-next-line no-unused-vars
                    const newUrl = new URL(`https://${targetUrl}`);
                    // Avoid using the direct result of the URL constructor
                    // to prevent encoding issues causing unwanted redirects
                    needsScheme = true;
                } catch {
                    // If the URL constructor throws an error, then the URL is invalid
                    return null;
                }
            }

            const newSite = new Site(needsScheme ? `https://${targetUrl}` : targetUrl);

            if (isSiteExcluded(newSite)) {
                return null;
            }

            return newSite.url;
        }
    }

    return null;
}

/**
 * Check if the given request is a suspected 1st party AMP URL. If it is, then we will attempt to fetch the canonical URL
 *
 * @param {object} requestData - request data
 * @param {object} thisTab - current tab
 * @param {object} mainFrameRequestURL - main frame request url
 * @returns true if the request is a suspected 1st party AMP url
 */
function tabNeedsDeepExtraction(requestData, thisTab, mainFrameRequestURL) {
    if (utils.getBrowserName() !== 'moz') {
        // deep extraction is only supported on Firefox
        return false;
    }

    if (!ensureConfig() || !ampSettings.deepExtractionEnabled) {
        return false;
    }

    if (requestIsExtension(requestData)) {
        return false;
    }

    if (thisTab.ampUrl && thisTab.ampUrl === mainFrameRequestURL.href) {
        return false;
    }

    return isAMPURL(mainFrameRequestURL.href);
}

/**
 * This method checks if the given url is a 1st party AMP url
 *
 * @param {string} url - the url being loaded
 * @returns true is the url is suspected to be a 1st party AMP url
 */
function isAMPURL(url) {
    if (!ensureConfig()) {
        return false;
    }

    const site = new Site(url);
    if (site.specialDomainName || !site.isFeatureEnabled(featureName)) {
        return false;
    }

    return ampSettings.keywords.some((keyword) => url.includes(keyword));
}

/**
 * This async method will fetch the DOM content of a suspected 1st party AMP URL and will
 * return the canonical URL if one is found.
 *
 * @param {Site} site - the initiating site
 * @param {string} url - the url being loaded
 * @returns cancalon url if found, null otherwise
 */
async function fetchAMPURL(site, url) {
    if (!ensureConfig()) {
        return null;
    }

    if (site.specialDomainName || !site.isFeatureEnabled(featureName) || site.url === 'about:blank') {
        return null;
    }

    let data = null;
    const timeoutController = new AbortController();
    setTimeout(() => timeoutController.abort(), ampSettings.deepExtractionTimeout || 1500);

    try {
        data = await fetch(url, { signal: timeoutController.signal });
    } catch (e) {
        console.error(e);
        return null;
    }

    if (!data) {
        return null;
    }

    const text = await data.text();
    if (!text) {
        return null;
    }

    const doc = new DOMParser().parseFromString(text, 'text/html');

    /** @type {HTMLLinkElement?} */
    const firstCanonicalLink = doc.querySelector('[rel="canonical"]');

    if (firstCanonicalLink && firstCanonicalLink instanceof HTMLLinkElement) {
        // Only follow http(s) links
        if (!isHttpUrl(firstCanonicalLink.href)) {
            return null;
        }

        const newSite = new Site(firstCanonicalLink.href);

        if (isSiteExcluded(newSite)) {
            return null;
        }

        return firstCanonicalLink.href;
    }

    return null;
}

/**
 * Check if the given request was initiated by the extension. On Chrome extension initiated requests
 * will cause a crash if we try to use fetch on their thread.
 *
 * @param {object} request - request object
 * @returns true if the request was initiated by an extension
 */
function requestIsExtension(request) {
    return request.initiator && request.initiator.startsWith('chrome-extension://');
}

tdsStorage.onUpdate('config', () => {
    ampSettings = null;
});

module.exports = {
    isAMPURL,
    extractAMPURL,
    fetchAMPURL,
    tabNeedsDeepExtraction,
};
