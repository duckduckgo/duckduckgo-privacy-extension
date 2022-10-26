/**
 *
 * This is part of our tool for anonymous broken site reports
 * Learn more at https://duck.co/help/privacy/atb
 *
 */
const load = require('./load.es6')
const browserWrapper = require('./wrapper.es6')
const settings = require('./settings.es6')
const parseUserAgentString = require('../shared-utils/parse-user-agent-string.es6')

/**
 *
 * Fire a pixel
 *
 * @param {string} querystring
 *
 */
export function fire (querystring) {
    const pixelName = 'epbf'
    const browserInfo = parseUserAgentString()
    const browser = browserInfo?.browser
    const extensionVersion = browserWrapper.getExtensionVersion()
    const atb = settings.getSetting('atb')

    const url = new URL(getURL(pixelName))
    url.search = querystring

    if (browser) {
        url.pathname += `_${browser.toLowerCase()}${browserInfo.manifestVersion === 3 ? 'mv3' : ''}`
    }
    if (extensionVersion) {
        url.searchParams.append('extensionVersion', extensionVersion)
    }
    if (atb) {
        url.searchParams.append('atb', atb)
    }
    if (url.searchParams.get('category') === 'null') {
        url.searchParams.delete('category')
    }

    // Send the request
    load.url(url.href)
}

/**
 *
 * Return URL for the pixel request
 *
 */
export function getURL (pixelName) {
    if (!pixelName) throw new Error('pixelName is required')

    const url = 'https://improving.duckduckgo.com/t/'
    return url + pixelName
}
