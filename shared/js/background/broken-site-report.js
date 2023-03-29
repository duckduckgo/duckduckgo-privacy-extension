/**
 *
 * This is part of our tool for anonymous broken site reports
 * Learn more at https://duck.co/help/privacy/atb
 *
 */
const load = require('./load')
const browserWrapper = require('./wrapper')
const settings = require('./settings')
const parseUserAgentString = require('../shared-utils/parse-user-agent-string')
const { getURLWithoutQueryString } = require('./utils')
const { getURL } = require('./pixels')

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
    ['tds', ...Object.values(requestCategoryMapping)].forEach((key) => {
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
 * @type {Object<import('../../../packages/privacy-grade/src/classes/trackers').ActionName, string>}
 */
const requestCategoryMapping = {
    ignore: 'ignoreRequests',
    block: 'blockedTrackers',
    redirect: 'surrogates',
    none: 'noActionRequests',
    'ad-attribution': 'adAttributionRequests',
    'ignore-user': 'ignoredByUserRequests'
}

/**
 * Given an optional category and description, create a report for a given Tab instance.
 *
 * This code previously lived within the UI section of the dashboard,
 * but has been moved here since there's no longer a relationship to 'where' this request
 * came from.
 *
 * @param {import("./classes/tab")} tab
 * @param {string} tds - tds-etag from settings
 * @param {string} remoteConfig - tds-config from settings
 * @param {string | undefined} category - optional category
 * @param {string | undefined} description - optional description
 */
export function breakageReportForTab (tab, tds, remoteConfig, category, description) {
    if (!tab.url) {
        return
    }
    const siteUrl = getURLWithoutQueryString(tab.url).split('#')[0]
    const requestCategories = {}

    // This is to satisfy the privacy reference tests expecting these keys to be present
    for (const requiredRequestCategory of Object.values(requestCategoryMapping)) {
        requestCategories[requiredRequestCategory] = []
    }

    for (const tracker of Object.values(tab.trackers)) {
        for (const [key, entry] of Object.entries(tracker.urls)) {
            const [fullDomain] = key.split(':')
            const requestCategory = requestCategoryMapping[entry.action]
            if (requestCategory) {
                requestCategories[requestCategory].push(fullDomain)
            }
        }
    }

    const urlParametersRemoved = tab.urlParametersRemoved ? 'true' : 'false'
    const ctlYouTube = tab.ctlYouTube ? 'true' : 'false'
    const ampUrl = tab.ampUrl || undefined
    const upgradedHttps = tab.upgradedHttps

    const brokenSiteParams = new URLSearchParams({
        siteUrl,
        tds,
        remoteConfig,
        upgradedHttps: upgradedHttps.toString(),
        urlParametersRemoved,
        ctlYouTube
    })

    for (const [key, value] of Object.entries(requestCategories)) {
        brokenSiteParams.append(key, value.join(','))
    }

    if (ampUrl) brokenSiteParams.set('ampUrl', ampUrl)
    if (category) brokenSiteParams.set('category', category)
    if (description) brokenSiteParams.set('description', description)

    return fire(brokenSiteParams.toString())
}
