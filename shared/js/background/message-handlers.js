import browser from 'webextension-polyfill'
import { dashboardDataFromTab } from './classes/privacy-dashboard-data'
import { breakageReportForTab } from './broken-site-report'
import parseUserAgentString from '../shared-utils/parse-user-agent-string'
import { getExtensionURL, notifyPopup } from './wrapper'
import { isFeatureEnabled, reloadCurrentTab } from './utils'
import { ensureClickToLoadRuleActionDisabled } from './dnr-click-to-load'
import tdsStorage from './storage/tds'
import { getArgumentsObject } from './helpers/arguments-object'
import { isFireButtonEnabled } from './components/fire-button'
const utils = require('./utils')
const settings = require('./settings')
const tabManager = require('./tab-manager')
const Companies = require('./companies')
const browserName = utils.getBrowserName()
const devtools = require('./devtools')
const browserWrapper = require('./wrapper')

export async function registeredContentScript (options, sender, req) {
    const sessionKey = await utils.getSessionKey()
    const argumentsObject = getArgumentsObject(sender.tab.id, sender, options?.documentUrl || req.documentUrl, sessionKey)
    if (!argumentsObject) {
        // No info for the tab available, do nothing.
        return
    }

    return argumentsObject
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
    // TODO: Consider making these tabManager.setList calls concurrently with
    //       Promise.all, but first verify that works in practice (e.g. with
    //       simultaneous DNR rule updates).
    for (const listItem of options.lists) {
        await tabManager.setList(listItem)
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
    const tds = settings.getSetting('tds-etag')
    const remoteConfigEtag = settings.getSetting('config-etag')
    const remoteConfigVersion = tdsStorage.config.version
    return breakageReportForTab({ tab, tds, remoteConfigEtag, remoteConfigVersion, category, description })
}

/**
 * @param tabId
 * @returns {Promise<import("./classes/tab")>}
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
    const fireButtonData = {
        enabled: isFireButtonEnabled
    }
    return dashboardDataFromTab(tab, userData, fireButtonData)
}

export function getTopBlockedByPages (options) {
    return Companies.getTopBlockedByPages(options)
}

/**
 * @typedef getClickToLoadStateResponse
 * @property {boolean} devMode
 *   True if developer mode is enabled (e.g. this is a development build or a
 *   test run), false if this is a release build.
 * @property {boolean} youtubePreviewsEnabled
 *   True if the user has enabled YouTube video previews, false otherwise.
 */

/**
 * Returns the current state of the Click to Load feature.
 * @returns {Promise<getClickToLoadStateResponse>}
 */
export async function getClickToLoadState () {
    const devMode =
        (await browserWrapper.getFromSessionStorage('dev')) || false

    await settings.ready()
    const youtubePreviewsEnabled =
        (await settings.getSetting('youtubePreviewsEnabled')) || false

    return { devMode, youtubePreviewsEnabled }
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

export async function unblockClickToLoadContent (data, sender) {
    const tab = tabManager.get({ tabId: sender.tab.id })

    if (!tab.disabledClickToLoadRuleActions.includes(data.action)) {
        tab.disabledClickToLoadRuleActions.push(data.action)
    }

    if (browserWrapper.getManifestVersion() === 3) {
        await ensureClickToLoadRuleActionDisabled(data.action, tab)
    }
}

export function updateYouTubeCTLAddedFlag (value, sender) {
    const tab = tabManager.get({ tabId: sender.tab.id })
    tab.ctlYouTube = Boolean(value)
}

/**
 * @typedef updateFacebookCTLBreakageFlagsRequest
 * @property {boolean} [ctlFacebookPlaceholderShown=false]
 *   True if at least one Facebook Click to Load placeholder was shown on the
 *   page.
 * @property {boolean} [ctlFacebookLogin=false]
 *   True if the user clicked to use a Facebook Click to Load login button.
 */

/**
 * Sets the Facebook Click to Load breakage flag(s) to true for the page, which
 * are then included should the user report the webpage as broken.
 * Note: False values are ignored, the flags are only updated if value is true.
 *       The flags are reset automatically when the user navigates away from
 *       the page.
 * @param {updateFacebookCTLBreakageFlagsRequest} flags
 * @param {browser.Runtime.MessageSender} sender
 */
export function updateFacebookCTLBreakageFlags (
    { ctlFacebookPlaceholderShown = false, ctlFacebookLogin = false },
    sender
) {
    const tabId = sender?.tab?.id
    if (typeof tabId === 'undefined') {
        return
    }

    const tab = tabManager.get({ tabId })

    if (ctlFacebookPlaceholderShown) {
        tab.ctlFacebookPlaceholderShown = true
    }

    if (ctlFacebookLogin) {
        tab.ctlFacebookLogin = true
    }
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

export function getTopBlocked (options) {
    return Companies.getTopBlocked(options)
}

export function getListContents (list) {
    const loader = globalThis.components.tds[list]
    return {
        data: tdsStorage.getSerializableList(list),
        etag: loader.etag
    }
}

/**
 * Manually override the value of a list
 * @param {{ name: string, value: object}} list value
 */
export async function setListContents ({ name, value }) {
    const loader = globalThis.components.tds[name]
    await loader.overrideDataValue(value)
    return loader.etag
}

export async function reloadList (listName) {
    await globalThis.components.tds[listName].checkForUpdates(true)
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

export async function isClickToLoadYoutubeEnabled () {
    await tdsStorage.ready('config')

    return (
        isFeatureEnabled('clickToLoad') &&
        tdsStorage?.config?.features?.clickToLoad?.settings?.Youtube?.state === 'enabled'
    )
}

export function addDebugFlag (message, sender, req) {
    const tab = tabManager.get({ tabId: sender.tab.id })
    const flags = new Set(tab.debugFlags)
    flags.add(message.flag)
    tab.debugFlags = [...flags]
}

/**
 * Add a new message handler.
 * @param {string} name
 * @param {(options: any, sender: any, req: any) => any} func
 */
export function registerMessageHandler (name, func) {
    if (messageHandlers[name]) {
        throw new Error(`Attempt to re-register existing message handler ${name}`)
    }
    messageHandlers[name] = func
}

/**
 * Default set of message handler functions used by the background message handler.
 *
 * Don't add new listeners to this list, instead import and call registerMessageHandler in your
 * feature's initialization code!
 */
const messageHandlers = {
    registeredContentScript,
    resetTrackersData,
    getExtensionVersion,
    setList,
    setLists,
    allowlistOptIn,
    getBrowser,
    openOptions,
    submitBrokenSiteReport,
    getTab,
    getPrivacyDashboardData,
    getTopBlockedByPages,
    getClickToLoadState,
    getYouTubeVideoDetails,
    getCurrentTab,
    unblockClickToLoadContent,
    updateYouTubeCTLAddedFlag,
    updateFacebookCTLBreakageFlags,
    setYoutubePreviewsEnabled,
    updateSetting,
    getSetting,
    getTopBlocked,
    getListContents,
    setListContents,
    reloadList,
    debuggerMessage,
    search,
    openShareFeedbackPage,
    isClickToLoadYoutubeEnabled,
    addDebugFlag
}
export default messageHandlers
