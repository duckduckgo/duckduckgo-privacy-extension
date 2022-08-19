/**
 * NOTE: this needs to be the first listener that's added
 *
 * on FF, we might actually miss the onInstalled event
 * if we do too much before adding it
 */
import browser from 'webextension-polyfill'
import * as messageHandlers from './message-handlers'
const ATB = require('./atb.es6')
const utils = require('./utils.es6')
const experiment = require('./experiments.es6')
const settings = require('./settings.es6')
const constants = require('../../data/constants')
const onboarding = require('./onboarding.es6')
const cspProtection = require('./csp-blocking.es6')
const browserName = utils.getBrowserName()
const devtools = require('./devtools.es6')
const tdsStorage = require('./storage/tds.es6')
const browserWrapper = require('./wrapper.es6')
const limitReferrerData = require('./events/referrer-trimming')
const { dropTracking3pCookiesFromResponse, dropTracking3pCookiesFromRequest } = require('./events/3p-tracking-cookie-blocking')
const getArgumentsObject = require('./helpers/arguments-object')
const startup = require('./startup.es6')

const sha1 = require('../shared-utils/sha1')

const manifestVersion = browserWrapper.getManifestVersion()

/**
 * Produce a random float, same output as Math.random()
 * @returns {number}
 */
function getFloat () {
    return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
}

function getHash () {
    return sha1(getFloat().toString())
}

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

    // Inject the email content script on all tabs upon installation (not needed on Firefox)
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
            target: { tabId: tabId },
            func: onboarding.onDocumentStart,
            args: [{
                duckDuckGoSerpHostname: constants.duckDuckGoSerpHostname
            }],
            injectImmediately: true
        })
    }

    browserWrapper.executeScript({
        target: { tabId: tabId },
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

const redirect = require('./redirect.es6')
const tabManager = require('./tab-manager.es6')
const https = require('./https.es6')

if (manifestVersion === 2) {
    browser.webRequest.onBeforeRequest.addListener(
        redirect.handleRequest,
        {
            urls: ['<all_urls>']
        },
        ['blocking']
    )
}

if (manifestVersion === 2) {
    const extraInfoSpec = ['blocking', 'responseHeaders']
    if (browser.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS) {
        extraInfoSpec.push(browser.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS)
    }

    // We determine if browsingTopics is enabled by testing for availability of its
    // JS API.
    // Note: This approach will not work with MV3 since the background
    //       ServiceWorker does not have access to a `document` Object.
    const isTopicsEnabled = ('browsingTopics' in document) && utils.isFeatureEnabled('googleRejected')
    browser.webRequest.onHeadersReceived.addListener(
        request => {
            if (request.type === 'main_frame') {
                tabManager.updateTabUrl(request)

                const tab = tabManager.get({ tabId: request.tabId })
                // SERP ad click detection
                if (
                    utils.isRedirect(request.statusCode)
                ) {
                    tab.setAdClickIfValidRedirect(request, tab.site.baseDomain)
                } else if (tab && tab.adClick && tab.adClick.adClickRedirect && !utils.isRedirect(request.statusCode)) {
                    tab.adClick.adClickRedirect = false
                    tab.adClick.adBaseDomain = tab.site.baseDomain
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

    // Wait until the extension configuration has finished loading and then
    // start dropping tracking cookies.
    // Note: Event listeners must be registered in the top-level of the script
    //       to be compatible with MV3. Registering the listener asynchronously
    //       is only possible here as this is a MV2-only event listener!
    // See https://developer.chrome.com/docs/extensions/mv3/migrating_to_service_workers/#event_listeners
    startup.ready().then(() => {
        browser.webRequest.onHeadersReceived.addListener(
            dropTracking3pCookiesFromResponse,
            { urls: ['<all_urls>'] },
            extraInfoSpec
        )
    })
}

browser.webNavigation.onCreatedNavigationTarget.addListener(details => {
    const currentTab = tabManager.get({ tabId: details.sourceTabId })
    if (currentTab && currentTab.adClick) {
        const newTab = tabManager.createOrUpdateTab(details.tabId, { url: details.url })
        if (currentTab.adClick.shouldPropagateAdClickForNewTab(newTab)) {
            newTab.adClick = currentTab.adClick
        }
    }
})

/**
 * Web Navigation
 */
// keep track of URLs that the browser navigates to.
//
// this is currently meant to supplement tabManager.updateTabUrl() above:
// tabManager.updateTabUrl only fires when a tab has finished loading with a 200,
// which misses a couple of edge cases like browser special pages
// and Gmail's weird redirect which returns a 200 via a service worker
browser.webNavigation.onCommitted.addListener(details => {
    // ignore navigation on iframes
    if (details.frameId !== 0) return

    const tab = tabManager.get({ tabId: details.tabId })

    if (!tab) return

    tab.updateSite(details.url)
    devtools.postMessage(details.tabId, 'tabChange', tab)
})

/**
 * TABS
 */

const Companies = require('./companies.es6')

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
} = require('./email-utils.es6')

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

    if (req.messageType && req.messageType in messageHandlers) {
        return Promise.resolve(messageHandlers[req.messageType](req.options, sender))
    }
    if (req.messageType === 'registeredContentScript' || req.registeredTempAutofillContentScript) {
        const argumentsObject = getArgumentsObject(sender.tab.id, sender, req.options?.documentUrl || req.documentUrl, sessionKey)
        if (!argumentsObject) {
            // No info for the tab available, do nothing.
            return
        }

        if (argumentsObject.site.isBroken) {
            console.log('temporarily skip protections for site: ' + sender.tab.url +
        'more info: https://github.com/duckduckgo/privacy-configuration')
            return
        }

        return Promise.resolve(argumentsObject)
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

/**
 * Fingerprint Protection
 */
// TODO fix for manifest v3
let sessionKey = getHash()

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
const GPC = require('./GPC.es6')

if (manifestVersion === 2) {
    const extraInfoSpecSendHeaders = ['blocking', 'requestHeaders']
    if (browser.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS) {
        extraInfoSpecSendHeaders.push(browser.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS)
    }
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

    // Wait until the extension configuration has finished loading and then
    // start dropping tracking cookies.
    // Note: Event listeners must be registered in the top-level of the script
    //       to be compatible with MV3. Registering the listener asynchronously
    //       is only possible here as this is a MV2-only event listener!
    // See https://developer.chrome.com/docs/extensions/mv3/migrating_to_service_workers/#event_listeners
    startup.ready().then(() => {
        browser.webRequest.onBeforeSendHeaders.addListener(
            dropTracking3pCookiesFromRequest,
            { urls: ['<all_urls>'] },
            extraInfoSpecSendHeaders
        )
    })
}

// Inject the Click to Load content script to display placeholders.
browser.webNavigation.onCommitted.addListener(details => {
    const tab = tabManager.get({ tabId: details.tabId })

    if (!tab || tab.site.specialDomainName) {
        return
    }

    if (tab.site.isBroken) {
        console.log('temporarily skip embedded object replacements for site: ' + details.url +
          'more info: https://github.com/duckduckgo/privacy-configuration')
        return
    }

    if (utils.getClickToPlaySupport(tab)) {
        browserWrapper.executeScript({
            target: {
                tabId: details.tabId,
                frameIds: [details.frameId]
            },
            files: ['public/js/content-scripts/click-to-load.js'],
            injectImmediately: true
        })
    }
})

/**
 * ALARMS
 */

const httpsStorage = require('./storage/https.es6')
const httpsService = require('./https-service.es6')
const trackers = require('./trackers.es6')

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
        // TODO fix for manifest v3
        sessionKey = getHash()
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
