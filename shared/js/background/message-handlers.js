import browser from 'webextension-polyfill'
import { dashboardDataFromTab } from './classes/privacy-dashboard-data'
import { breakageReportForTab } from './broken-site-report'
import parseUserAgentString from '../shared-utils/parse-user-agent-string'
import { getBrowserName } from './utils'
import { ensureClickToLoadRuleActionDisabled } from './dnr-click-to-load'
import { getArgumentsObject } from './helpers/arguments-object'
const { getDomain } = require('tldts')
const trackers = require('./trackers')
const constants = require('../../data/constants')

const {
    isValidToken,
    isValidUsername,
    getAddresses,
    fetchAlias,
    showContextMenuAction,
    hideContextMenuAction
} = require('./email-utils')

export class LegacyMessageHandlers {
    /**
     * @param {import("./tab-manager").TabManager} tabManager
     * @param {import("./companies").Companies} companies
     * @param {import("./devtools").DevTools} devTools
     * @param {import("./settings").Settings} settings
     * @param {import("./wrapper").BrowserWrapper} browser
     * @param {import("./utils").Utils} utils
     * @param {import("./storage/tds").TDSStorage} tdsStorage
     */
    constructor (tabManager, companies, devTools, settings, browser, utils, tdsStorage) {
        this.tabManager = tabManager
        this.companies = companies
        this.devTools = devTools
        this.settings = settings
        this.browser = browser
        this.utils = utils
        this.tdsStorage = tdsStorage
    }

    async registeredContentScript (options, sender, req) {
        const sessionKey = await this.utils.getSessionKey()
        const argumentsObject = getArgumentsObject(sender.tab.id, sender, options?.documentUrl || req.documentUrl, sessionKey, this.tabManager, this.devTools)
        if (!argumentsObject) {
            // No info for the tab available, do nothing.
            return
        }

        return argumentsObject
    }

    resetTrackersData () {
        return this.companies.resetData()
    }

    getExtensionVersion () {
        return this.browser.getExtensionVersion()
    }

    /**
     * This is used from the options page - to manually update the user allow list
     *
     * @param options
     */
    setList (options) {
        this.tabManager.setList(options)
    }

    /**
     * This is used by the Dashboard to update the allow/deny lists, close the popup + reload
     *
     * @param {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').SetListOptions} options
     */
    async setLists (options) {
        for (const listItem of options.lists) {
            this.tabManager.setList(listItem)
        }

        try {
            this.browser.notifyPopup({ closePopup: true })
            this.utils.reloadCurrentTab()
        } catch (e) {
            console.error('Error trying to reload+refresh following `setLists` message', e)
        }
    }

    allowlistOptIn (optInData) {
        this.tabManager.setGlobalAllowlist('allowlistOptIn', optInData.domain, optInData.value)
    }

    // popup will ask for the browser type then it is created
    getBrowser () {
        const browserName = getBrowserName()
        return browserName
    }

    openOptions () {
        const browserName = getBrowserName()
        if (browserName === 'moz') {
            browser.tabs.create({ url: this.browser.getExtensionURL('/html/options.html') })
        } else {
            browser.runtime.openOptionsPage()
        }
    }

    /**
     * Only the dashboard sends this message, so we import the types from there.
     * @param {import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').BreakageReportRequest} breakageReport
     * @returns {Promise<void>}
     */
    async submitBrokenSiteReport (breakageReport) {
        const { category, description } = breakageReport

        const currentTab = await this.utils.getCurrentTab()
        if (!currentTab?.id) {
            console.error('could not access the current tab...')
            return
        }

        const tab = await this.getTab(currentTab.id)
        if (!tab) {
            console.error('cannot access current tab with ID ' + currentTab.id)
            return
        }
        const tds = this.settings.getSetting('tds-etag')
        const remoteConfigEtag = this.settings.getSetting('config-etag')
        const remoteConfigVersion = this.tdsStorage.config.version
        return breakageReportForTab({ tab, tds, remoteConfigEtag, remoteConfigVersion, category, description })
    }

    /**
     * @param tabId
     * @returns {Promise<import("./classes/tab")>}
     */
    async getTab (tabId) {
        // Await for storage to be ready; this happens on service worker closing mostly.
        await this.settings.ready()
        await this.tdsStorage.ready('config')
        return this.tabManager.getOrRestoreTab(tabId)
    }

    /**
     * This message is here to ensure the privacy dashboard can render
     * from a single call to the extension.
     *
     * Currently, it will collect data for the current tab and email protection
     * user data.
     */
    async getPrivacyDashboardData (options) {
        let { tabId } = options
        if (tabId === null) {
            const currentTab = await this.utils.getCurrentTab()
            if (!currentTab?.id) {
                throw new Error('could not get the current tab...')
            }
            tabId = currentTab?.id
        }
        const tab = await this.getTab(tabId)
        if (!tab) throw new Error('unreachable - cannot access current tab with ID ' + tabId)
        const userData = this.settings.getSetting('userData')
        return dashboardDataFromTab(tab, userData)
    }

    getTopBlockedByPages (options) {
        return this.companies.getTopBlockedByPages(options)
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
    async getClickToLoadState () {
        const devMode =
            (await this.browser.getFromSessionStorage('dev')) || false

        await this.settings.ready()
        const youtubePreviewsEnabled =
            (await this.settings.getSetting('youtubePreviewsEnabled')) || false

        return { devMode, youtubePreviewsEnabled }
    }

    async getYouTubeVideoDetails (videoURL) {
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

    async unblockClickToLoadContent (data, sender) {
        const tab = this.tabManager.get({ tabId: sender.tab.id })

        if (!tab.disabledClickToLoadRuleActions.includes(data.action)) {
            tab.disabledClickToLoadRuleActions.push(data.action)
        }

        if (this.browser.getManifestVersion() === 3) {
            await ensureClickToLoadRuleActionDisabled(data.action, tab)
        }
    }

    updateYouTubeCTLAddedFlag (value, sender) {
        const tab = this.tabManager.get({ tabId: sender.tab.id })
        tab.ctlYouTube = Boolean(value)
    }

    setYoutubePreviewsEnabled (value, sender) {
        return this.updateSetting({ name: 'youtubePreviewsEnabled', value })
    }

    async updateSetting ({ name, value }) {
        await this.settings.ready()
        this.settings.updateSetting(name, value)
        this.utils.sendAllTabsMessage({ messageType: `ddg-settings-${name}`, value })
        return { messageType: `ddg-settings-${name}`, value }
    }

    async getSetting ({ name }) {
        await this.settings.ready()
        return this.settings.getSetting(name)
    }

    getAlias () {
        const userData = this.settings.getSetting('userData')
        return { alias: userData?.nextAlias }
    }

    /**
     * @returns {Promise<import('@duckduckgo/privacy-dashboard/schema/__generated__/schema.types').RefreshAliasResponse>}
     */
    async refreshAlias () {
        await fetchAlias()
        return getAddresses()
    }

    getTopBlocked (options) {
        return this.companies.getTopBlocked(options)
    }

    isExpectedSender (sender) {
        try {
            const domain = getDomain(sender.url)
            const { pathname } = new URL(sender.url)
            return domain === 'duckduckgo.com' && pathname.startsWith('/email')
        } catch {
            return false
        }
    }

    getEmailProtectionCapabilities (_, sender) {
        if (!this.isExpectedSender(sender)) return

        return {
            addUserData: true,
            getUserData: true,
            removeUserData: true
        }
    }

    getIncontextSignupDismissedAt () {
        const permanentlyDismissedAt = this.settings.getSetting('incontextSignupPermanentlyDismissedAt')
        const installedDays = this.tdsStorage.config.features.incontextSignup?.settings?.installedDays ?? 3
        const isInstalledRecently = this.utils.isInstalledWithinDays(installedDays)
        return { success: { permanentlyDismissedAt, isInstalledRecently } }
    }

    setIncontextSignupPermanentlyDismissedAt ({ value }) {
        this.settings.updateSetting('incontextSignupPermanentlyDismissedAt', value)
    }

    // Get user data to be used by the email web app settings page. This includes
    // username, last alias, and a token for generating additional aliases.
    async getUserData (_, sender) {
        if (!this.isExpectedSender(sender)) return

        await this.settings.ready()
        const userData = this.settings.getSetting('userData')
        if (userData) {
            return userData
        } else {
            return { error: 'Something seems wrong with the user data' }
        }
    }

    async addUserData (userData, sender) {
        const { userName, token } = userData
        if (!this.isExpectedSender(sender)) return

        const sendDdgUserReady = async () => {
            const tabs = await browser.tabs.query({})
            tabs.forEach((tab) =>
                this.utils.sendTabMessage(tab.id, { type: 'ddgUserReady' })
            )
        }

        await this.settings.ready()
        const { existingToken } = this.settings.getSetting('userData') || {}

        // If the user is already registered, just notify tabs that we're ready
        if (existingToken === token) {
            sendDdgUserReady()
            return { success: true }
        }

        // Check general data validity
        if (isValidUsername(userName) && isValidToken(token)) {
            this.settings.updateSetting('userData', userData)
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

    async removeUserData (_, sender) {
        if (!this.isExpectedSender(sender)) return
        await this.logout()
    }

    async logout () {
        this.settings.updateSetting('userData', {})
        this.settings.updateSetting('lastAddressUsedAt', '')
        // Broadcast the logout to all tabs
        const tabs = await browser.tabs.query({})
        tabs.forEach((tab) => {
            this.utils.sendTabMessage(tab.id, { type: 'logout' })
        })
        hideContextMenuAction()
    }

    getListContents (list) {
        return {
            data: this.tdsStorage.getSerializableList(list),
            etag: this.settings.getSetting(`${list}-etag`) || ''
        }
    }

    /**
     * Manually override the value of a list
     * @param {{ name: string, value: object}} list value
     */
    async setListContents ({ name, value }) {
        const parsed = this.tdsStorage.parsedata(name, value)
        this.tdsStorage[name] = parsed
        trackers.setLists([{
            name,
            data: parsed
        }])
        // create an etag hash based on the content
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(parsed)))
        const etag = [...new Uint8Array(hash)]
            .map(x => x.toString(16).padStart(2, '0'))
            .join('')
        this.settings.updateSetting(`${name}-lastUpdate`, Date.now())
        this.settings.updateSetting(`${name}-etag`, etag)
        await this.tdsStorage._internalOnListUpdate(name, value)
        return etag
    }

    async reloadList (listName) {
        const list = constants.tdsLists.find(l => l.name === listName)
        if (list) {
            trackers.setLists([await this.tdsStorage.getList(list)])
        }
    }

    debuggerMessage (message, sender) {
        this.devTools.postMessage(sender.tab?.id, message.action, message.message)
    }

    search ({ term }) {
        const browserInfo = parseUserAgentString()
        if (browserInfo?.os) {
            const url = new URL('https://duckduckgo.com')
            url.searchParams.set('q', term)
            url.searchParams.set('bext', browserInfo.os + 'cr')
            browser.tabs.create({ url: url.toString() })
        }
    }

    openShareFeedbackPage () {
        return this.browser.openExtensionPage('/html/feedback.html')
    }

    async isClickToLoadYoutubeEnabled () {
        await this.tdsStorage.ready('config')

        return (
            this.utils.isFeatureEnabled('clickToLoad') &&
            this.tdsStorage?.config?.features?.clickToLoad?.settings?.Youtube?.state === 'enabled'
        )
    }
}

export { getAddresses }
