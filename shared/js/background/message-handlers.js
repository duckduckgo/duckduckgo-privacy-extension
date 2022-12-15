import browser from 'webextension-polyfill'
import * as startup from './startup'
import { dashboardDataFromTab } from './classes/privacy-dashboard-data'
import { breakageReportForTab } from './broken-site-report'
import parseUserAgentString from '../shared-utils/parse-user-agent-string.es6'
import { getExtensionURL, notifyPopup } from './wrapper.es6'
import { reloadCurrentTab } from './utils.es6'
const { getDomain } = require('tldts')
const utils = require('./utils.es6')
const settings = require('./settings.es6')
const tabManager = require('./tab-manager.es6')
const tdsStorage = require('./storage/tds.es6')
const trackerutils = require('./tracker-utils')
const trackers = require('./trackers.es6')
const constants = require('../../data/constants')
const Companies = require('./companies.es6')
const browserName = utils.getBrowserName()
const devtools = require('./devtools.es6')
const browserWrapper = require('./wrapper.es6')
const { enableInverseRules } = require('./classes/custom-rules-manager')
const getArgumentsObject = require('./helpers/arguments-object')

export async function registeredContentScript (options, sender, req) {
    const sessionKey = await utils.getSessionKey()
    const argumentsObject = getArgumentsObject(sender.tab.id, sender, options?.documentUrl || req.documentUrl, sessionKey)
    if (!argumentsObject) {
        // No info for the tab available, do nothing.
        return
    }

    return argumentsObject
}

export async function getDevMode () {
    const dev = await browserWrapper.getFromSessionStorage('dev')
    return dev || false
}

export async function getIntegrationTestMode () {
    const integrationTest =
        await browserWrapper.getFromSessionStorage('integrationTest')
    return integrationTest || false
}

export function resetTrackersData () {
    return Companies.resetData()
}

export function getExtensionVersion () {
    return browserWrapper.getExtensionVersion()
}

/**
 * This is used from the options page - to manually update the user allow list
 *
 * @param options
 */
export function setList (options) {
    tabManager.setList(options)
}

/**
 * This is used by the Dashboard to update the allow/deny lists, close the popup + reload
 *
 * @param {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').SetListOptions} options
 */
export async function setLists (options) {
    for (const listItem of options.lists) {
        tabManager.setList(listItem)
    }

    try {
        notifyPopup({ closePopup: true })
        reloadCurrentTab()
    } catch (e) {
        console.error('Error trying to reload+refresh following `setLists` message', e)
    }
}

export function allowlistOptIn (optInData) {
    tabManager.setGlobalAllowlist('allowlistOptIn', optInData.domain, optInData.value)
}

// popup will ask for the browser type then it is created
export function getBrowser () {
    return browserName
}

export function openOptions () {
    if (browserName === 'moz') {
        browser.tabs.create({ url: getExtensionURL('/html/options.html') })
    } else {
        browser.runtime.openOptionsPage()
    }
}

/**
 * Only the dashboard sends this message, so we import the types from there.
 * @param {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').BreakageReportRequest} breakageReport
 * @returns {Promise<void>}
 */
export async function submitBrokenSiteReport (breakageReport) {
    const { category, description } = breakageReport

    const currentTab = await utils.getCurrentTab()
    if (!currentTab?.id) {
        console.error('could not access the current tab...')
        return
    }

    const tab = await getTab(currentTab.id)
    if (!tab) {
        console.error('cannot access current tab with ID ' + currentTab.id)
        return
    }
    const tsd = settings.getSetting('tds-etag')
    return breakageReportForTab(tab, tsd, category, description)
}

/**
 * @param tabId
 * @returns {Promise<import("./classes/tab.es6")>}
 */
async function getTab (tabId) {
    // Await for storage to be ready; this happens on service worker closing mostly.
    await settings.ready()
    await tdsStorage.ready('config')
    return tabManager.getOrRestoreTab(tabId)
}

/**
 * This message is here to ensure the privacy dashboard can render
 * from a single call to the extension.
 *
 * Currently, it will collect data for the current tab and email protection
 * user data.
 */
export async function getPrivacyDashboardData (options) {
    let { tabId } = options
    if (tabId === null) {
        const currentTab = await utils.getCurrentTab()
        if (!currentTab?.id) {
            throw new Error('could not get the current tab...')
        }
        tabId = currentTab?.id
    }
    const tab = await getTab(tabId)
    if (!tab) throw new Error('unreachable - cannot access current tab with ID ' + tabId)
    const userData = settings.getSetting('userData')
    return dashboardDataFromTab(tab, userData)
}

export function getTopBlockedByPages (options) {
    return Companies.getTopBlockedByPages(options)
}

// Click to load interactions
export async function initClickToLoad (config, sender) {
    await settings.ready()
    const tab = tabManager.get({ tabId: sender.tab.id })

    // Remove first-party entries.
    await startup.ready()

    // Overwrite the content-scope-scripts Click to Load configuration with the
    // legacy configuration for the integration tests.
    // TODO: When the legacy configuration is finally removed, this should be
    //       adjusted.
    if (await getDevMode() && await getIntegrationTestMode()) {
        config = tdsStorage.ClickToLoadConfig
    }

    const siteUrlSplit = tab.site.domain.split('.')
    const websiteOwner = trackers.findWebsiteOwner({ siteUrlSplit })
    if (websiteOwner) {
        delete config[websiteOwner]
    }

    // Determine whether to show one time messages or simplified messages
    for (const entity of Object.keys(config)) {
        const clickToLoadClicks = settings.getSetting('clickToLoadClicks') || {}
        const maxClicks = config[entity].clicksBeforeSimpleVersion || 3
        if (clickToLoadClicks[entity] && clickToLoadClicks[entity] >= maxClicks) {
            config[entity].simpleVersion = true
        }
    }

    // if the current site is on the social exception list, remove it from the config.
    let excludedNetworks = trackerutils.getDomainsToExludeByNetwork()
    if (excludedNetworks) {
        excludedNetworks = excludedNetworks.filter(e => e.domain === tab.site.domain)
        excludedNetworks.forEach(e => delete config[e.entity])
    }
    return config
}

export async function getYouTubeVideoDetails (videoURL) {
    const endpointURL = new URL('https://www.youtube.com/oembed?format=json')
    const parsedVideoURL = new URL(videoURL)

    const playlistID = parsedVideoURL.searchParams.get('list')
    const videoId = parsedVideoURL.pathname.split('/').pop()

    if (playlistID) {
        parsedVideoURL.hostname = endpointURL.hostname
        endpointURL.searchParams.set('url', parsedVideoURL.href)
    } else {
        endpointURL.searchParams.set('url', 'https://youtu.be/' + videoId)
    }

    try {
        const youTubeVideoResponse = await fetch(
            endpointURL.href, {
                referrerPolicy: 'no-referrer',
                credentials: 'omit'
            }
        ).then(response => response.json())
        const { title, thumbnail_url: previewImage } = youTubeVideoResponse
        return { status: 'success', videoURL, title, previewImage }
    } catch (e) {
        return { status: 'failed', videoURL }
    }
}

export function getCurrentTab () {
    return utils.getCurrentTab()
}

export async function enableSocialTracker (data, sender) {
    const tab = tabManager.get({ tabId: sender.tab.id })
    const entity = data.entity

    if (browserWrapper.getManifestVersion() === 3) {
        let { action } = data

        // TODO: Remove this workaround once the corresponding
        //       content-scope-scripts code is fixed. So far, the action is
        //       hardcoded to "block-ctl-fb" no matter the entity.
        if (data.entity === 'Youtube' && action === 'block-ctl-fb') {
            action = 'block-ctl-yt'
        }

        await enableInverseRules(action, sender.tab.id)
    }
    tab.site.clickToLoad.push(entity)

    if (data.isLogin) {
        trackerutils.allowSocialLogin(tab.site.domain)
    }
    settings.ready().then(() => {
        // Update number of times this social network has been 'clicked'
        if (tdsStorage.ClickToLoadConfig[entity]) {
            const clickToLoadClicks = settings.getSetting('clickToLoadClicks') || {}
            const maxClicks = tdsStorage.ClickToLoadConfig[entity].clicksBeforeSimpleVersion || 3
            if (!clickToLoadClicks[entity]) {
                clickToLoadClicks[entity] = 1
            } else if (clickToLoadClicks[entity] && clickToLoadClicks[entity] < maxClicks) {
                clickToLoadClicks[entity] += 1
            }
            // don't await for setting to be updated
            settings.updateSetting('clickToLoadClicks', clickToLoadClicks)
        }
    })
}

export function updateYouTubeCTLAddedFlag (value, sender) {
    const tab = tabManager.get({ tabId: sender.tab.id })
    tab.ctlYouTube = Boolean(value)
}

export function setYoutubePreviewsEnabled (value, sender) {
    return updateSetting({ name: 'youtubePreviewsEnabled', value })
}

export async function updateSetting ({ name, value }) {
    await settings.ready()
    settings.updateSetting(name, value)
    utils.sendAllTabsMessage({ messageType: `ddg-settings-${name}`, value })
    return { messageType: `ddg-settings-${name}`, value }
}

export async function getSetting ({ name }) {
    await settings.ready()
    return settings.getSetting(name)
}

export function getYoutubePreviewsEnabled () {
    return getSetting({ name: 'youtubePreviewsEnabled' })
}

const {
    isValidToken,
    isValidUsername,
    getAddresses,
    firePixel,
    fetchAlias,
    showContextMenuAction,
    hideContextMenuAction
} = require('./email-utils.es6')

export { getAddresses, firePixel }

export function getAlias () {
    const userData = settings.getSetting('userData')
    return { alias: userData?.nextAlias }
}

/**
 * @returns {Promise<import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').RefreshAliasResponse>}
 */
export async function refreshAlias () {
    await fetchAlias()
    return getAddresses()
}

export function getTopBlocked (options) {
    return Companies.getTopBlocked(options)
}

function isExpectedSender (sender) {
    try {
        const domain = getDomain(sender.url)
        const { pathname } = new URL(sender.url)
        return domain === 'duckduckgo.com' && pathname.startsWith('/email')
    } catch {
        return false
    }
}

export function getEmailProtectionCapabilities (_, sender) {
    if (!isExpectedSender(sender)) return

    return {
        addUserData: true,
        getUserData: true,
        removeUserData: true
    }
}

// Get user data to be used by the email web app settings page. This includes
// username, last alias, and a token for generating additional aliases.
export async function getUserData (_, sender) {
    if (!isExpectedSender(sender)) return

    await settings.ready()
    const userData = settings.getSetting('userData')
    if (userData) {
        return userData
    } else {
        return { error: 'Something seems wrong with the user data' }
    }
}

export async function addUserData (userData, sender) {
    const { userName, token } = userData
    if (!isExpectedSender(sender)) return

    const sendDdgUserReady = async () => {
        const tabs = await browser.tabs.query({})
        tabs.forEach((tab) =>
            utils.sendTabMessage(tab.id, { type: 'ddgUserReady' })
        )
    }

    await settings.ready()
    const { existingToken } = settings.getSetting('userData') || {}

    // If the user is already registered, just notify tabs that we're ready
    if (existingToken === token) {
        sendDdgUserReady()
        return { success: true }
    }

    // Check general data validity
    if (isValidUsername(userName) && isValidToken(token)) {
        settings.updateSetting('userData', userData)
        // Once user is set, fetch the alias and notify all tabs
        const response = await fetchAlias()
        if (response && 'error' in response) {
            return { error: response.error.message }
        }

        sendDdgUserReady()
        showContextMenuAction()
        return { success: true }
    } else {
        return { error: 'Something seems wrong with the user data' }
    }
}

export async function removeUserData (_, sender) {
    if (!isExpectedSender(sender)) return
    await logout()
}

export async function logout () {
    settings.updateSetting('userData', {})
    settings.updateSetting('lastAddressUsedAt', '')
    // Broadcast the logout to all tabs
    const tabs = await browser.tabs.query({})
    tabs.forEach((tab) => {
        utils.sendTabMessage(tab.id, { type: 'logout' })
    })
    hideContextMenuAction()
}

export function getListContents (list) {
    return {
        data: tdsStorage.getSerializableList(list),
        etag: settings.getSetting(`${list}-etag`) || ''
    }
}

/**
 * Manually override the value of a list
 * @param {{ name: string, value: object}} list value
 */
export async function setListContents ({ name, value }) {
    const parsed = tdsStorage.parsedata(name, value)
    tdsStorage[name] = parsed
    trackers.setLists([{
        name,
        data: parsed
    }])
    // create an etag hash based on the content
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(parsed)))
    const etag = [...new Uint8Array(hash)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('')
    settings.updateSetting(`${name}-lastUpdate`, Date.now())
    settings.updateSetting(`${name}-etag`, etag)
    await tdsStorage._internalOnListUpdate(name, value)
    return etag
}

export async function reloadList (listName) {
    const list = constants.tdsLists.find(l => l.name === listName)
    if (list) {
        trackers.setLists([await tdsStorage.getList(list)])
    }
}

export function debuggerMessage (message, sender) {
    devtools.postMessage(sender.tab?.id, message.action, message.message)
}

export function search ({ term }) {
    const browserInfo = parseUserAgentString()
    if (browserInfo?.os) {
        const url = new URL('https://duckduckgo.com')
        url.searchParams.set('q', term)
        url.searchParams.set('bext', browserInfo.os + 'cr')
        browser.tabs.create({ url: url.toString() })
    }
}

export function openShareFeedbackPage () {
    return browserWrapper.openExtensionPage('/html/feedback.html')
}
