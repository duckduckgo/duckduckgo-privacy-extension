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
const maxPixelLength = 7000

/**
 *
 * Fire a pixel
 *
 * @param {string} querystring
 *
 */
export function fire (querystring) {
    let url = constructUrl(querystring, false)

    // If we're over the max pixel length, truncate the less important params
    if (url.length > maxPixelLength) {
        url = constructUrl(querystring, true)
    }

    // Send the request
    load.url(url)
}

function constructUrl (querystring, truncate) {
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
    if (truncate) {
        searchParams.append('truncated', '1')
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
    [...Object.values(requestCategoryMapping)].forEach((key) => {
        // if we're truncating, don't include the truncatable fields
        if (truncate && truncatableFields.includes(key)) return
        if (searchParams.has(key)) {
            extraParams += `&${key}=${decodeURIComponent(searchParams.get(key) || '')}`
            searchParams.delete(key)
        }
    })
    url += `${searchParams.toString()}${extraParams}`
    return url
}

const truncatableFields = ['ignoreRequests', 'noActionRequests', 'adAttributionRequests', 'ignoredByUserRequests']

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

function computeLastSentDay (urlString) {
    const url = new URL(urlString)
    const time = new Date()
    // Round time to nearest day
    time.setHours(0, 0, 0, 0)
    // Output time as a string in the format YYYY-MM-DD
    const dayOutput = time.toISOString().split('T')[0]

    const reportTimes = settings.getSetting('brokenSiteReportTimes') || {}
    const lastSentDay = reportTimes[url.hostname]

    // Update existing time
    reportTimes[url.hostname] = dayOutput
    settings.updateSetting('brokenSiteReportTimes', reportTimes)

    return lastSentDay
}

/**
 * Given an optional category and description, create a report for a given Tab instance.
 *
 * This code previously lived within the UI section of the dashboard,
 * but has been moved here since there's no longer a relationship to 'where' this request
 * came from.
 *
 * @param {Object} arg
 * @prop {import("./classes/tab")} arg.tab
 * @prop {string} arg.tds - tds-etag from settings
 * @prop {string} arg.remoteConfigEtag - config-etag from settings
 * @prop {string} arg.remoteConfigVersion - config version
 * @prop {string | undefined} arg.category - optional category
 * @prop {string | undefined} arg.description - optional description
 */
export function breakageReportForTab ({
    tab, tds, remoteConfigEtag, remoteConfigVersion,
    category, description
}) {
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
    const ctlFacebookPlaceholderShown = tab.ctlFacebookPlaceholderShown ? 'true' : 'false'
    const ctlFacebookLogin = tab.ctlFacebookLogin ? 'true' : 'false'
    const ampUrl = tab.ampUrl || undefined
    const upgradedHttps = tab.upgradedHttps
    const debugFlags = tab.debugFlags.join(',')
    const errorDescriptions = JSON.stringify(tab.errorDescriptions)
    const httpErrorCodes = tab.httpErrorCodes.join(',')
    const lastSentDay = computeLastSentDay(tab.url)

    const brokenSiteParams = new URLSearchParams({
        siteUrl,
        tds,
        remoteConfigEtag,
        remoteConfigVersion,
        upgradedHttps: upgradedHttps.toString(),
        urlParametersRemoved,
        ctlYouTube,
        ctlFacebookPlaceholderShown,
        ctlFacebookLogin
    })

    for (const [key, value] of Object.entries(requestCategories)) {
        brokenSiteParams.append(key, value.join(','))
    }

    if (lastSentDay) brokenSiteParams.set('lastSentDay', lastSentDay)
    if (ampUrl) brokenSiteParams.set('ampUrl', ampUrl)
    if (category) brokenSiteParams.set('category', category)
    if (debugFlags) brokenSiteParams.set('debugFlags', debugFlags)
    if (description) brokenSiteParams.set('description', description)
    if (errorDescriptions) brokenSiteParams.set('errorDescriptions', errorDescriptions)
    if (httpErrorCodes) brokenSiteParams.set('httpErrorCodes', httpErrorCodes)

    return fire(brokenSiteParams.toString())
}
