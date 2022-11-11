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
    const randomNum = Math.ceil(Math.random() * 1e7)
    const pixelName = 'epbf'
    const browserInfo = parseUserAgentString()
    const browser = browserInfo?.browser
    const extensionVersion = browserWrapper.getExtensionVersion()
    const atb = settings.getSetting('atb')

    const searchParams = new URLSearchParams(querystring)

    if (extensionVersion) {
        searchParams.append('extensionVersion', extensionVersion)
    }
    if (atb) {
        searchParams.append('atb', atb)
    }
    if (searchParams.get('category') === 'null') {
        searchParams.delete('category')
    }
    // build url string
    let url = getURL(pixelName)
    if (browser) {
        url += `_${browser.toLowerCase()}`
    }
    // random number cache buster
    url += `?${randomNum}&`
    // some params should be not urlencoded
    let extraParams = '';
    ['blockedTrackers', 'surrogates'].forEach((key) => {
        if (searchParams.has(key)) {
            extraParams += `&${key}=${decodeURIComponent(searchParams.get(key) || '')}`
            searchParams.delete(key)
        }
    })
    url += `${searchParams.toString()}${extraParams}`

    // Send the request
    load.url(url)
}

/**
 *
 * Return URL for the pixel request
 * @param {string} pixelName
 * @returns {string}
 */
export function getURL (pixelName) {
    if (!pixelName) throw new Error('pixelName is required')

    const url = 'https://improving.duckduckgo.com/t/'
    return url + pixelName
}
