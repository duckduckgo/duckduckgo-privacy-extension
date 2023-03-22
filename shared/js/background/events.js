/**
 * NOTE: this needs to be the first listener that's added
 *
 * on FF, we might actually miss the onInstalled event
 * if we do too much before adding it
 */
import browser from 'webextension-polyfill'
import * as messageHandlers from './message-handlers'
import { updateActionIcon } from './events/privacy-icon-indicator'
import { flushSessionRules } from './dnr-session-rule-id'
import { restoreDefaultClickToLoadRuleActions } from './dnr-click-to-load'
import {
    clearInvalidDynamicRules
} from './dnr-utils'
import {
    refreshUserAllowlistRules
} from './dnr-user-allowlist'
import tdsStorage from './storage/tds'
import httpsStorage from './storage/https'
import ATB from './atb'
const utils = require('./utils')
const experiment = require('./experiments')
const settings = require('./settings')
const constants = require('../../data/constants')
const onboarding = require('./onboarding')
const cspProtection = require('./csp-blocking')
const browserName = utils.getBrowserName()
const devtools = require('./devtools')
const browserWrapper = require('./wrapper')
const limitReferrerData = require('./events/referrer-trimming')
const { dropTracking3pCookiesFromResponse, dropTracking3pCookiesFromRequest, validateSetCookieBlock } = require('./events/3p-tracking-cookie-blocking')

const manifestVersion = browserWrapper.getManifestVersion()

async function onInstalled (details) {
    tdsStorage.initOnInstall()

    if (details.reason.match(/install/)) {
        await settings.ready()
        settings.updateSetting('showWelcomeBanner', true)
        if (browserName === 'chrome') {
            settings.updateSetting('showCounterMessaging', true)
        }
        await ATB.updateATBValues()
        await ATB.openPostInstallPage()

        if (browserName === 'chrome') {
            experiment.setActiveExperiment()
        }
    } else if (details.reason.match(/update/) && browserName === 'chrome') {
        experiment.setActiveExperiment()
    }

    if (manifestVersion === 3) {
        await settings.ready()

        // remove any orphaned session rules (can happen on extension update/restart)
        await flushSessionRules()

        // check that the dynamic rule state is consistent with the rule ranges we expect
        clearInvalidDynamicRules()

        // create ATB rule if there is a stored value in settings
        ATB.setOrUpdateATBdnrRule(settings.getSetting('atb'))

        // Refresh the user allowlisting declarativeNetRequest rule, only
        // necessary to handle the upgrade between MV2 and MV3 extensions.
        // TODO: Remove this a while after users have all been migrated to
        //       the MV3 build.
        const allowlist = settings.getSetting('allowlisted') || {}
        const allowlistedDomains = []
        for (const [domain, enabled] of Object.entries(allowlist)) {
            if (enabled) {
                allowlistedDomains.push(domain)
            }
        }
        await refreshUserAllowlistRules(allowlistedDomains)
    }

    // Inject the email content script on all tabs upon installation (not needed on Firefox)
    // FIXME the below code throws an unhandled exception in MV3
    try {
        if (browserName !== 'moz') {
            const tabs = await browser.tabs.query({})
            for (const tab of tabs) {
                // Ignore URLs that we aren't permitted to access
                if (tab.url.startsWith('chrome://')) {
                    continue
                }
                await browserWrapper.executeScript({
                    target: { tabId: tab.id },
                    files: ['public/js/content-scripts/autofill.js']
                })
            }
        }
    } catch (e) {
        console.warn('Failed to inject email content script at startup:', e)
    }
}

browser.runtime.onInstalled.addListener(onInstalled)

/**
 * ONBOARDING
 * Logic to allow the SERP to display onboarding UI
 */
async function onboardingMessaging ({ transitionQualifiers, tabId }) {
    await settings.ready()
    const showWelcomeBanner = settings.getSetting('showWelcomeBanner')
    const showCounterMessaging = settings.getSetting('showCounterMessaging')

    // If the onboarding messaging has already been displayed, there's no need
    // to trigger this event listener any longer.
    if (!showWelcomeBanner && !showCounterMessaging) {
        browser.webNavigation.onCommitted.removeListener(onboardingMessaging)
        return
    }

    // The counter messaging should only be active for the very first search
    // navigation observed.
    const isAddressBarQuery = transitionQualifiers.includes('from_address_bar')
    if (isAddressBarQuery && showCounterMessaging) {
        settings.removeSetting('showCounterMessaging')
    }

    // Clear the showWelcomeBanner setting to ensure that the welcome banner
    // isn't shown again in the future.
    if (showWelcomeBanner) {
        settings.removeSetting('showWelcomeBanner')
    }

    // Display the onboarding messaging.

    if (browserName === 'chrome') {
        browserWrapper.executeScript({
            target: { tabId },
            func: onboarding.onDocumentStart,
            args: [{
                duckDuckGoSerpHostname: constants.duckDuckGoSerpHostname
            }],
            injectImmediately: true
        })
    }

    browserWrapper.executeScript({
        target: { tabId },
        func: onboarding.onDocumentEnd,
        args: [{
            isAddressBarQuery,
            showWelcomeBanner,
            showCounterMessaging,
            browserName,
            duckDuckGoSerpHostname: constants.duckDuckGoSerpHostname,
            extensionId: browserWrapper.getExtensionId()
        }],
        injectImmediately: false
    })
}

browser.webNavigation.onCommitted.addListener(
    onboardingMessaging, {
        // We only target the search results page (SERP), which has a 'q' query
        // parameter. Two filters are required since the parameter is not
        // necessarily first.
        url: [
            {
                schemes: ['https'],
                hostEquals: constants.duckDuckGoSerpHostname,
                pathEquals: '/',
                queryContains: '?q='
            },
            {
                schemes: ['https'],
                hostEquals: constants.duckDuckGoSerpHostname,
                pathEquals: '/',
                queryContains: '&q='
            }
        ]
    }
)

/**
 * Health checks + `showCounterMessaging` mutation
 * (Chrome only)
 */
if (browserName === 'chrome') {
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
        if (request === 'healthCheckRequest') {
            sendResponse(true)
        } else if (request === 'rescheduleCounterMessagingRequest') {
            await settings.ready()
            settings.updateSetting('rescheduleCounterMessagingOnStart', true)
            sendResponse(true)
        }
    })

    browser.runtime.onStartup.addListener(async () => {
        await settings.ready()

        if (settings.getSetting('rescheduleCounterMessagingOnStart')) {
            settings.removeSetting('rescheduleCounterMessagingOnStart')
            settings.updateSetting('showCounterMessaging', true)
        }
    })
}

/**
 * REQUESTS
 */

const beforeRequest = require('./before-request')
const tabManager = require('./tab-manager')
const https = require('./https')

let additionalOptions = []
if (manifestVersion === 2) {
    additionalOptions = ['blocking']
}
browser.webRequest.onBeforeRequest.addListener(
    beforeRequest.handleRequest,
    {
        urls: ['<all_urls>']
    },
    additionalOptions
)

// MV2 needs blocking for webRequest
// MV3 still needs some info from response headers
const extraInfoSpec = ['responseHeaders']
if (manifestVersion === 2) {
    extraInfoSpec.push('blocking')
}

if (browser.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS) {
    extraInfoSpec.push(browser.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS)
}

// We determine if browsingTopics is enabled by testing for availability of its
// JS API.
// Note: This approach will not work with MV3 since the background
//       ServiceWorker does not have access to a `document` Object.
const isTopicsEnabled = manifestVersion === 2 && 'browsingTopics' in document && utils.isFeatureEnabled('googleRejected')

browser.webRequest.onHeadersReceived.addListener(
    request => {
        if (request.type === 'main_frame') {
            tabManager.updateTabUrl(request)

            const tab = tabManager.get({ tabId: request.tabId })
            // SERP ad click detection
            if (
                utils.isRedirect(request.statusCode)
            ) {
                tab.setAdClickIfValidRedirect(request.url)
            } else if (tab && tab.adClick && tab.adClick.adClickRedirect && !utils.isRedirect(request.statusCode)) {
                tab.adClick.setAdBaseDomain(tab.site.baseDomain)
            }
        }

        if (ATB.shouldUpdateSetAtb(request)) {
            // returns a promise
            return ATB.updateSetAtb()
        }

        const responseHeaders = request.responseHeaders

        if (isTopicsEnabled && responseHeaders && (request.type === 'main_frame' || request.type === 'sub_frame')) {
            // there can be multiple permissions-policy headers, so we are good always appending one
            // According to Google's docs a site can opt out of browsing topics the same way as opting out of FLoC
            // https://privacysandbox.com/proposals/topics (See FAQ)
            responseHeaders.push({ name: 'permissions-policy', value: 'interest-cohort=()' })
        }

        return { responseHeaders }
    },
    { urls: ['<all_urls>'] },
    extraInfoSpec
)

// Store the created tab id for when onBeforeNavigate is called so data can be copied across from the source tab
const createdTargets = new Map()
browser.webNavigation.onCreatedNavigationTarget.addListener(details => {
    createdTargets.set(details.tabId, details.sourceTabId)
})

/**
 * Web Navigation
 */
// keep track of URLs that the browser navigates to.
//
// this is supplemented by tabManager.updateTabUrl() on headersReceived:
// tabManager.updateTabUrl only fires when a tab has finished loading with a 200,
// which misses a couple of edge cases like browser special pages
// and Gmail's weird redirect which returns a 200 via a service worker
browser.webNavigation.onBeforeNavigate.addListener(details => {
    // ignore navigation on iframes
    if (details.frameId !== 0) return

    const currentTab = tabManager.get({ tabId: details.tabId })
    const newTab = tabManager.create({ tabId: details.tabId, url: details.url })

    if (manifestVersion === 3) {
        // Ensure that the correct declarativeNetRequest allowing rules are
        // added for this tab.
        // Note: The webNavigation.onBeforeCommitted event would be better,
        //       since onBeforeNavigate can be fired for a navigation that is
        //       not later committed. But since there is a race-condition
        //       between the page loading and the rules being added, let's use
        //       onBeforeNavigate for now as it fires sooner.
        restoreDefaultClickToLoadRuleActions(newTab)
    }

    // persist the last URL the tab was trying to upgrade to HTTPS
    if (currentTab && currentTab.httpsRedirects) {
        newTab.httpsRedirects.persistMainFrameRedirect(currentTab.httpsRedirects.getMainFrameRedirect())
    }
    if (createdTargets.has(details.tabId)) {
        const sourceTabId = createdTargets.get(details.tabId)
        createdTargets.delete(details.tabId)

        const sourceTab = tabManager.get({ tabId: sourceTabId })
        if (sourceTab && sourceTab.adClick) {
            createdTargets.set(details.tabId, sourceTabId)
            if (sourceTab.adClick.shouldPropagateAdClickForNewTab(newTab)) {
                newTab.adClick = sourceTab.adClick.propagate(newTab.id)
            }
        }
    }

    newTab.updateSite(details.url)
    devtools.postMessage(details.tabId, 'tabChange', devtools.serializeTab(newTab))
})

/**
 * TABS
 */

const Companies = require('./companies')

browser.tabs.onCreated.addListener((info) => {
    if (info.id) {
        tabManager.createOrUpdateTab(info.id, info)
    }
})

browser.tabs.onUpdated.addListener((id, info) => {
    // sync company data to storage when a tab finishes loading
    if (info.status === 'complete') {
        Companies.syncToStorage()
    }

    tabManager.createOrUpdateTab(id, info)
})

browser.tabs.onRemoved.addListener((id, info) => {
    // remove the tab object
    tabManager.delete(id)
})

// message popup to close when the active tab changes.
browser.tabs.onActivated.addListener(() => {
    browserWrapper.notifyPopup({ closePopup: true })
})

// search via omnibox
browser.omnibox.onInputEntered.addListener(async function (text) {
    const tabs = await browser.tabs.query({
        currentWindow: true,
        active: true
    })
    browser.tabs.update(tabs[0].id, {
        url: 'https://duckduckgo.com/?q=' + encodeURIComponent(text) + '&bext=' + utils.getOsName() + 'cl'
    })
})

/**
 * MESSAGES
 */
const {
    REFETCH_ALIAS_ALARM,
    fetchAlias
} = require('./email-utils')

// Handle any messages that come from content/UI scripts
browser.runtime.onMessage.addListener((req, sender) => {
    if (sender.id !== browserWrapper.getExtensionId()) return

    // TODO clean up message passing
    const legacyMessageTypes = [
        'addUserData',
        'getUserData',
        'removeUserData',
        'getEmailProtectionCapabilities',
        'getAddresses',
        'refreshAlias',
        'debuggerMessage'
    ]
    for (const legacyMessageType of legacyMessageTypes) {
        if (legacyMessageType in req) {
            req.messageType = legacyMessageType
            req.options = req[legacyMessageType]
        }
    }

    if (req.registeredTempAutofillContentScript) {
        req.messageType = 'registeredContentScript'
    }

    if (req.messageType && req.messageType in messageHandlers) {
        return Promise.resolve(messageHandlers[req.messageType](req.options, sender, req))
    }

    // TODO clean up legacy onboarding messaging
    if (browserName === 'chrome') {
        if (req === 'healthCheckRequest' || req === 'rescheduleCounterMessagingRequest') {
            return
        }
    }

    console.error('Unrecognized message to background:', req, sender)
    return false
})

/*
 * Referrer Trimming
 */
if (manifestVersion === 2) {
    const referrerListenerOptions = ['blocking', 'requestHeaders']
    if (browser.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS) {
        referrerListenerOptions.push(browser.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS)
    }

    browser.webRequest.onBeforeSendHeaders.addListener(
        limitReferrerData,
        { urls: ['<all_urls>'] },
        referrerListenerOptions
    )
}

/**
 * Global Privacy Control
 */
const GPC = require('./GPC')
const extraInfoSpecSendHeaders = ['requestHeaders']
if (browser.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS) {
    extraInfoSpecSendHeaders.push(browser.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS)
}

if (manifestVersion === 2) {
    extraInfoSpecSendHeaders.push('blocking')
    // Attach GPC header to all requests if enabled.
    browser.webRequest.onBeforeSendHeaders.addListener(
        request => {
            const tab = tabManager.get({ tabId: request.tabId })
            const GPCHeader = GPC.getHeader()
            const GPCEnabled = tab && tab.site.isFeatureEnabled('gpc')

            const requestHeaders = request.requestHeaders
            if (GPCHeader && GPCEnabled) {
                requestHeaders.push(GPCHeader)
            }

            return { requestHeaders }
        },
        { urls: ['<all_urls>'] },
        extraInfoSpecSendHeaders
    )
}

browser.webRequest.onBeforeSendHeaders.addListener(
    dropTracking3pCookiesFromRequest,
    { urls: ['<all_urls>'] },
    extraInfoSpecSendHeaders
)

browser.webRequest.onHeadersReceived.addListener(
    dropTracking3pCookiesFromResponse,
    { urls: ['<all_urls>'] },
    extraInfoSpec
)

if (manifestVersion === 3) {
    browser.webRequest.onCompleted.addListener(
        validateSetCookieBlock,
        { urls: ['<all_urls>'] },
        extraInfoSpec
    )
}

/**
 * For each completed page load, update the extension's action icon
 */
browser.webNavigation.onCompleted.addListener(details => {
    // only update the icon when the outermost frame is complete
    if (details.parentFrameId !== -1) return

    // try to access the tab where this event originated
    const tab = tabManager.get({ tabId: details.tabId })

    // just to be sure that we can access the current tab
    if (!tab) return

    // select the next icon state
    updateActionIcon(tab.site, tab.id)
        .catch(e => console.error('could not set the action icon', e))
})

/**
 * ALARMS
 */

const httpsService = require('./https-service')
const trackers = require('./trackers')

browserWrapper.createAlarm('updateHTTPSLists', {
    periodInMinutes: httpsStorage.updatePeriodInMinutes
})
browserWrapper.createAlarm('updateLists', {
    periodInMinutes: tdsStorage.updatePeriodInMinutes
})
// update uninstall URL every 10 minutes
browserWrapper.createAlarm('updateUninstallURL', { periodInMinutes: 10 })
// remove expired HTTPS service entries
browserWrapper.createAlarm('clearExpiredHTTPSServiceCache', { periodInMinutes: 60 })
// Rotate the user agent spoofed
browserWrapper.createAlarm('rotateUserAgent', { periodInMinutes: 24 * 60 })
// Rotate the sessionKey
browserWrapper.createAlarm('rotateSessionKey', { periodInMinutes: 24 * 60 })

browser.alarms.onAlarm.addListener(async alarmEvent => {
    // Warning: Awaiting in this function doesn't actually wait for the promise to resolve before unblocking the main thread.
    if (alarmEvent.name === 'updateHTTPSLists') {
        await settings.ready()
        try {
            const lists = await httpsStorage.getLists()
            https.setLists(lists)
        } catch (e) {
            console.log(e)
        }
    } else if (alarmEvent.name === 'updateUninstallURL') {
        browser.runtime.setUninstallURL(await ATB.getSurveyURL())
    } else if (alarmEvent.name === 'updateLists') {
        await settings.ready()

        try {
            const lists = await tdsStorage.getLists()
            trackers.setLists(lists)
        } catch (e) {
            console.log(e)
        }
    } else if (alarmEvent.name === 'clearExpiredHTTPSServiceCache') {
        httpsService.clearExpiredCache()
    } else if (alarmEvent.name === 'rotateSessionKey') {
        await utils.resetSessionKey()
    } else if (alarmEvent.name === REFETCH_ALIAS_ALARM) {
        fetchAlias()
    }
})

// Count https upgrade failures to allow bad data to be removed from lists
browser.webRequest.onErrorOccurred.addListener(e => {
    if (!(e.type === 'main_frame')) return

    const tab = tabManager.get({ tabId: e.tabId })

    // We're only looking at failed main_frame upgrades. A tab can send multiple
    // main_frame request errors so we will only look at the first one then set tab.hasHttpsError.
    if (!tab || !tab.mainFrameUpgraded || tab.hasHttpsError) {
        return
    }

    if (e.error && e.url.match(/^https/)) {
        const errCode = constants.httpsErrorCodes[e.error]
        tab.hasHttpsError = true

        if (errCode) {
            https.incrementUpgradeCount('failedUpgrades')
        }
    }
}, { urls: ['<all_urls>'] })

if (browserName === 'moz') {
    cspProtection.init()
}
devtools.init()
