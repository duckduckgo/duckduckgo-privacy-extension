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
        url += `_${browser.toLowerCase()}${browserWrapper.getManifestVersion() === 3 ? 'mv3' : ''}`
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

/**
 * Given an optional category and description, create a report for a given Tab instance.
 *
 * This code previously lived within the UI section of the dashboard,
 * but has been moved here since there's no longer a relationship to 'where' this request
 * came from.
 *
 * @param {import("./classes/tab.es6")} tab
 * @param {string} tds - tds-etag from settings
 * @param {string | undefined} category - optional category
 * @param {string | undefined} description - optional description
 */
export function breakageReportForTab (tab, tds, category, description) {
    const siteUrl = tab.url?.split('?')[0].split('#')[0]
    if (!siteUrl) {
        return
    }

    const blocked = []
    const surrogates = []

    for (const tracker of Object.values(tab.trackers)) {
        for (const [key, entry] of Object.entries(tracker.urls)) {
            const [fullDomain] = key.split(':')
            if (entry.action === 'block') {
                blocked.push(fullDomain)
            }
            if (entry.action === 'redirect') {
                surrogates.push(fullDomain)
            }
        }
    }

    const urlParametersRemoved = tab.urlParametersRemoved ? 'true' : 'false'
    const ampUrl = tab.ampUrl || undefined
    const upgradedHttps = tab.upgradedHttps

    const brokenSiteParams = new URLSearchParams({
        siteUrl,
        tds,
        upgradedHttps: upgradedHttps.toString(),
        urlParametersRemoved,
        blockedTrackers: blocked.join(','),
        surrogates: surrogates.join(',')
    })

    if (ampUrl) brokenSiteParams.set('ampUrl', ampUrl)
    if (category) brokenSiteParams.set('category', category)
    if (description) brokenSiteParams.set('description', description)

    return fire(brokenSiteParams.toString())
}
