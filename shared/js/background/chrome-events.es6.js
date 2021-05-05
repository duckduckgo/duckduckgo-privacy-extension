/**
 * NOTE: this needs to be the first listener that's added
 *
 * on FF, we might actually miss the onInstalled event
 * if we do too much before adding it
 */
import 'regenerator-runtime/runtime' // needed for async/await until we config @babel/preset-env more precisely
const tldts = require('tldts')
const ATB = require('./atb.es6')
const utils = require('./utils.es6')
const trackerutils = require('./tracker-utils')
const experiment = require('./experiments.es6')
const settings = require('./settings.es6')
const constants = require('../../data/constants')
const onboarding = require('./onboarding.es6')
const cspProtection = require('./csp-blocking.es6')
const browserName = utils.getBrowserName()

const sha1 = require('../shared-utils/sha1')

const RELEASE_EXTENSION_IDS = [
    'caoacbimdbbljakfhgikoodekdnlcgpk', // edge store
    'bkdgflcldnnnapblkhphbgpggdiikppg', // chrome store
    'jid1-ZAdIEUB7XOzOJw@jetpack' // firefox
]
const IS_BETA = RELEASE_EXTENSION_IDS.indexOf(chrome.runtime.id) === -1 // eslint-disable-line no-unused-vars

/**
 * Produce a random float, same output as Math.random()
 * @returns {float}
 */
function getFloat () {
    return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
}

function getHash () {
    return sha1(getFloat().toString())
}

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason.match(/install/)) {
        settings.ready()
            .then(() => {
                settings.updateSetting('showWelcomeBanner', true)
                if (browserName === 'chrome') {
                    settings.updateSetting('showCounterMessaging', true)
                }
            })
            .then(ATB.updateATBValues)
            .then(ATB.openPostInstallPage)
            .then(function () {
                if (browserName === 'chrome') {
                    experiment.setActiveExperiment()
                }
            })
    } else if (details.reason.match(/update/) && browserName === 'chrome') {
        experiment.setActiveExperiment()
    }

    // Inject the email content script on all tabs upon installation (not needed on Firefox)
    if (browserName !== 'moz') {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.executeScript(tab.id, { file: 'public/js/content-scripts/autofill.js' })
            })
        })
    }
})

/**
 * ONBOARDING
 * Logic to allow the SERP to display onboarding UI
 */

let onBeforeNavigateTimeStamp = null
chrome.webNavigation.onBeforeNavigate.addListener(details => {
    onBeforeNavigateTimeStamp = details.timeStamp
})

chrome.webNavigation.onCommitted.addListener(async details => {
    await settings.ready()
    const showWelcomeBanner = settings.getSetting('showWelcomeBanner')
    const showCounterMessaging = settings.getSetting('showCounterMessaging')

    // We show the welcome banner and counter messaging only once
    if (showWelcomeBanner || showCounterMessaging) {
        const isAddressBarQuery = details.transitionQualifiers.includes('from_address_bar')

        if (showWelcomeBanner) {
            settings.removeSetting('showWelcomeBanner')
        }
        if (isAddressBarQuery && showCounterMessaging) {
            settings.removeSetting('showCounterMessaging')
        }

        if (onBeforeNavigateTimeStamp < details.timeStamp) {
            if (browserName === 'chrome') {
                chrome.tabs.executeScript(details.tabId, {
                    code: onboarding.createOnboardingCodeInjectedAtDocumentStart({
                        duckDuckGoSerpHostname: constants.duckDuckGoSerpHostname
                    }),
                    runAt: 'document_start'
                })
            }

            chrome.tabs.executeScript(details.tabId, {
                code: onboarding.createOnboardingCodeInjectedAtDocumentEnd({
                    isAddressBarQuery,
                    showWelcomeBanner,
                    showCounterMessaging,
                    browserName,
                    duckDuckGoSerpHostname: constants.duckDuckGoSerpHostname,
                    extensionId: chrome.runtime.id
                }),
                runAt: 'document_end'
            })
        }
    }
}, {
    // we only target the SERP (it has a `q` querystring param but not necessarily as the first querstring param)
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
})

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

    chrome.runtime.onStartup.addListener(async () => {
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
const pixel = require('./pixel.es6')
const https = require('./https.es6')
const cookieConfig = require('./../background/storage/cookies.es6')

const requestListenerTypes = utils.getUpdatedRequestListenerTypes()

function blockTrackingCookies () {
    return true
}

// we determine if FLoC is enabled by testing for availability of its JS API
const isFlocEnabled = ('interestCohort' in document)

// Overwrite FLoC JS API
if (isFlocEnabled) {
    chrome.webNavigation.onCommitted.addListener(details => {
        const tab = tabManager.get({ tabId: details.tabId })
        if (tab && tab.site.whitelisted) return

        chrome.tabs.executeScript(details.tabId, {
            file: 'public/js/content-scripts/floc.js',
            frameId: details.frameId,
            matchAboutBlank: true,
            runAt: 'document_start'
        })
    })
}

// Shallow copy of request types
// And add beacon type based on browser, so we can block it
chrome.webRequest.onBeforeRequest.addListener(
    redirect.handleRequest,
    {
        urls: ['<all_urls>'],
        types: requestListenerTypes
    },
    ['blocking']
)

const extraInfoSpec = ['blocking', 'responseHeaders']
if (chrome.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS) {
    extraInfoSpec.push(chrome.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS)
}
chrome.webRequest.onHeadersReceived.addListener(
    request => {
        if (request.type === 'main_frame') {
            tabManager.updateTabUrl(request)
        }

        if (/^https?:\/\/(.*?\.)?duckduckgo.com\/\?/.test(request.url)) {
            // returns a promise
            return ATB.updateSetAtb(request)
        }

        let responseHeaders = request.responseHeaders

        if (isFlocEnabled && responseHeaders && (request.type === 'main_frame' || request.type === 'sub_frame')) {
            // there can be multiple permissions-policy headers, so we are good always appending one
            responseHeaders.push({ name: 'permissions-policy', value: 'interest-cohort=()' })
        }

        if (blockTrackingCookies()) {
            if (!trackerutils.isTracker(request.url)) {
                return { responseHeaders }
            }

            // Strip 3rd party response header
            const tab = tabManager.get({ tabId: request.tabId })
            if (!request.responseHeaders) return { responseHeaders }
            if (tab && tab.site.whitelisted) return { responseHeaders }
            if (!tab) {
                const initiator = request.initiator || request.documentUrl
                if (!initiator || trackerutils.isFirstPartyByEntity(initiator, request.url)) {
                    return { responseHeaders }
                }
            } else if (tab && trackerutils.isFirstPartyByEntity(request.url, tab.url)) {
                return { responseHeaders }
            }
            if (!cookieConfig.isExcluded(request.url)) {
                responseHeaders = responseHeaders.filter(header => header.name.toLowerCase() !== 'set-cookie')
            }
        }

        return { responseHeaders }
    },
    {
        urls: ['<all_urls>']
    },
    extraInfoSpec
)

/**
 * Web Navigation
 */
// keep track of URLs that the browser navigates to.
//
// this is currently meant to supplement tabManager.updateTabUrl() above:
// tabManager.updateTabUrl only fires when a tab has finished loading with a 200,
// which misses a couple of edge cases like browser special pages
// and Gmail's weird redirect which returns a 200 via a service worker
chrome.webNavigation.onCommitted.addListener(details => {
    // ignore navigation on iframes
    if (details.frameId !== 0) return

    const tab = tabManager.get({ tabId: details.tabId })

    if (!tab) return

    tab.updateSite(details.url)
})

/**
 * TABS
 */

const Companies = require('./companies.es6')

chrome.tabs.onUpdated.addListener((id, info) => {
    // sync company data to storage when a tab finishes loading
    if (info.status === 'complete') {
        Companies.syncToStorage()
    }

    tabManager.createOrUpdateTab(id, info)
})

chrome.tabs.onRemoved.addListener((id, info) => {
    // remove the tab object
    tabManager.delete(id)
})

// message popup to close when the active tab changes. this can send an error message when the popup is not open. check lastError to hide it
chrome.tabs.onActivated.addListener(() => chrome.runtime.sendMessage({ closePopup: true }, () => chrome.runtime.lastError))

// search via omnibox
chrome.omnibox.onInputEntered.addListener(function (text) {
    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, function (tabs) {
        chrome.tabs.update(tabs[0].id, {
            url: 'https://duckduckgo.com/?q=' + encodeURIComponent(text) + '&bext=' + localStorage.os + 'cl'
        })
    })
})

/**
 * MESSAGES
 */
const browserWrapper = require('./chrome-wrapper.es6')
const {
    REFETCH_ALIAS_ALARM,
    fetchAlias,
    showContextMenuAction,
    hideContextMenuAction,
    getAddresses,
    isValidUsername,
    isValidToken
} = require('./email-utils.es6')

// handle any messages that come from content/UI scripts
// returning `true` makes it possible to send back an async response
chrome.runtime.onMessage.addListener((req, sender, res) => {
    if (sender.id !== chrome.runtime.id) return

    if (req.registeredContentScript || req.registeredTempAutofillContentScript) {
        const argumentsObject = getArgumentsObject(sender.tab.id, sender, req.documentUrl)
        if (!argumentsObject) {
            // No info for the tab available, do nothing.
            return
        }

        if (argumentsObject.site.isBroken) {
            console.log('temporarily skip protections for site: ' + sender.tab.url +
        'more info: https://github.com/duckduckgo/content-blocking-whitelist')
            return
        }
        if (!argumentsObject.site.whitelisted) {
            res(argumentsObject)
            return
        }
        return
    }

    if (req.getCurrentTab) {
        utils.getCurrentTab().then(tab => {
            res(tab)
        })

        return true
    }

    // Click to load interactions
    if (req.initClickToLoad) {
        settings.ready().then(() => {
            const tab = tabManager.get({ tabId: sender.tab.id })
            const config = { ...tdsStorage.ClickToLoadConfig }

            // remove any social networks saved by the user
            for (const [entity] of Object.entries(tdsStorage.ClickToLoadConfig)) {
                if (trackerutils.socialTrackerIsAllowedByUser(entity, tab.site.domain)) {
                    delete config[entity]
                }
            }

            // Determine whether to show one time messages or simplified messages
            for (const [entity] of Object.entries(config)) {
                const clickToLoadClicks = settings.getSetting('clickToLoadClicks') || {}
                const maxClicks = tdsStorage.ClickToLoadConfig[entity].clicksBeforeSimpleVersion || 3
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
            res(config)
        })
        return true
    }

    if (req.getImage) {
        if (req.getImage === 'None' || req.getImage === 'none' || req.getImage === undefined) {
            res(undefined)
        } else {
            utils.imgToData(`img/social/${req.getImage}`).then(img => res(img))
        }
        return true
    }

    if (req.getLoadingImage) {
        if (req.getLoadingImage === 'dark') {
            utils.imgToData('img/social/loading_dark.svg').then(img => res(img))
        } else if (req.getLoadingImage === 'light') {
            utils.imgToData('img/social/loading_light.svg').then(img => res(img))
        }
        return true
    }

    if (req.getLogo) {
        utils.imgToData('img/social/dax.png').then(img => res(img))
        return true
    }

    if (req.getSocialSurrogateRules) {
        const entityData = tdsStorage.ClickToLoadConfig[req.getSocialSurrogateRules]
        if (entityData && entityData.surrogates) {
            const rules = entityData.surrogates.reduce(function reducer (accumulator, value) {
                accumulator.push(value.rule)
                return accumulator
            }, [])
            res(rules)
        }
        return true
    }

    if (req.enableSocialTracker) {
        settings.ready().then(() => {
            const tab = tabManager.get({ tabId: sender.tab.id })
            tab.site.clickToLoad.push(req.enableSocialTracker)

            const entity = req.enableSocialTracker
            if (req.isLogin) {
                trackerutils.allowSocialLogin(tab.site.domain)
            }
            if (req.alwaysAllow) {
                let allowList = settings.getSetting('clickToLoad')
                const value = {
                    tracker: entity,
                    domain: tab.site.domain
                }
                if (allowList) {
                    if (!trackerutils.socialTrackerIsAllowed(value.tracker, value.domain)) {
                        allowList.push(value)
                    }
                } else {
                    allowList = [value]
                }
                settings.updateSetting('clickToLoad', allowList)
            }
            // Update number of times this social network has been 'clicked'
            if (tdsStorage.ClickToLoadConfig[entity]) {
                const clickToLoadClicks = settings.getSetting('clickToLoadClicks') || {}
                const maxClicks = tdsStorage.ClickToLoadConfig[entity].clicksBeforeSimpleVersion || 3
                if (!clickToLoadClicks[entity]) {
                    clickToLoadClicks[entity] = 1
                } else if (clickToLoadClicks[entity] && clickToLoadClicks[entity] < maxClicks) {
                    clickToLoadClicks[entity] += 1
                }
                settings.updateSetting('clickToLoadClicks', clickToLoadClicks)
            }
        })
    }

    if (req.updateSetting) {
        const name = req.updateSetting.name
        const value = req.updateSetting.value
        settings.ready().then(() => {
            settings.updateSetting(name, value)
        })
    } else if (req.getSetting) {
        const name = req.getSetting.name
        settings.ready().then(() => {
            res(settings.getSetting(name))
        })

        return true
    }

    // popup will ask for the browser type then it is created
    if (req.getBrowser) {
        res(utils.getBrowserName())
        return true
    }

    if (req.getExtensionVersion) {
        res(browserWrapper.getExtensionVersion())
        return true
    }

    if (req.getTopBlocked) {
        res(Companies.getTopBlocked(req.getTopBlocked))
        return true
    } else if (req.getTopBlockedByPages) {
        res(Companies.getTopBlockedByPages(req.getTopBlockedByPages))
        return true
    } else if (req.resetTrackersData) {
        Companies.resetData()
    }

    if (req.whitelisted) {
        tabManager.whitelistDomain(req.whitelisted)
    } else if (req.whitelistOptIn) {
        tabManager.setGlobalWhitelist('whitelistOptIn', req.whitelistOptIn.domain, req.whitelistOptIn.value)
    } else if (req.getTab) {
        res(tabManager.get({ tabId: req.getTab }))
        return true
    } else if (req.getSiteGrade) {
        const tab = tabManager.get({ tabId: req.getSiteGrade })
        let grade = {}

        if (!tab.site.specialDomainName) {
            grade = tab.site.grade.get()
        }

        res(grade)
        return true
    }

    if (req.firePixel) {
        let fireArgs = req.firePixel
        if (fireArgs.constructor !== Array) {
            fireArgs = [req.firePixel]
        }
        res(pixel.fire.apply(null, fireArgs))
        return true
    }

    if (req.getAlias) {
        const userData = settings.getSetting('userData')
        res({ alias: userData?.nextAlias })

        return true
    }

    if (req.getAddresses) {
        res(getAddresses())

        return true
    }

    if (req.refreshAlias) {
        fetchAlias().then(() => {
            res(getAddresses())
        })

        return true
    }

    if (req.addUserData) {
        // Check the origin. Shouldn't be necessary, but better safe than sorry
        if (!sender.url.match(/^https:\/\/(([a-z0-9-_]+?)\.)?duckduckgo\.com/)) return

        const { userName, token } = req.addUserData
        const { existingToken } = settings.getSetting('userData') || {}

        // If the user is already registered, just notify tabs that we're ready
        if (existingToken === token) {
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach((tab) => {
                    chrome.tabs.sendMessage(tab.id, { type: 'ddgUserReady' })
                })
            })
            return
        }

        // Check general data validity
        if (isValidUsername(userName) && isValidToken(token)) {
            settings.updateSetting('userData', req.addUserData)
            // Once user is set, fetch the alias and notify all tabs
            fetchAlias().then(response => {
                if (response && response.error) {
                    return res({ error: response.error.message })
                }

                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach((tab) => {
                        chrome.tabs.sendMessage(tab.id, { type: 'ddgUserReady' })
                    })
                })
                showContextMenuAction()
                res({ success: true })
            })
        } else {
            res({ error: 'Something seems wrong with the user data' })
        }

        return true
    }

    if (req.logout) {
        settings.updateSetting('userData', {})
        // Broadcast the logout to all tabs
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                chrome.tabs.sendMessage(tab.id, { type: 'logout' })
            })
        })
        hideContextMenuAction()
    }
})

/**
 * Fingerprint Protection
 */
// TODO fix for manifest v3
let sessionKey = getHash()

function getArgumentsObject (tabId, sender, documentUrl) {
    const tab = tabManager.get({ tabId })
    if (!tab) {
        return null
    }
    if (chrome.runtime.lastError) { // Prevent thrown errors when the frame disappears
        return null
    }
    const site = tab?.site || {}
    const referrer = tab?.referrer || ''

    const cookie = {
        isThirdParty: false,
        shouldBlock: false,
        tabRegisteredDomain: null,
        isTrackerFrame: false,
        policy: cookieConfig.firstPartyCookiePolicy
    }
    if (!site.whitelisted && blockTrackingCookies()) {
        // determine the register domain of the sending tab
        const tabUrl = tab ? tab.url : sender.tab.url
        const parsed = tldts.parse(tabUrl)
        cookie.tabRegisteredDomain = parsed.domain === null ? parsed.hostname : parsed.domain

        if (documentUrl && trackerutils.isTracker(documentUrl) && sender.frameId !== 0) {
            cookie.isTrackerFrame = true
        }

        cookie.isThirdParty = !trackerutils.isFirstPartyByEntity(sender.url, sender.tab.url)
        cookie.shouldBlock = !cookieConfig.isExcluded(sender.url)
    }
    return {
        cookie,
        globalPrivacyControlValue: settings.getSetting('GPC'),
        stringExemptionLists: utils.getBrokenScriptLists(),
        sessionKey,
        site,
        referrer
    }
}

/*
 * Truncate the referrer header according to the following rules:
 *   Don't modify the header when:
 *   - If the header is blank, it will not be modified.
 *   - If the referrer domain OR request domain are safe listed, the header will not be modified
 *   - If the referrer domain and request domain are part of the same entity (as defined in our
 *     entities file for first party sets), the header will not be modified.
 *
 *   Modify the header when:
 *   - If the destination is in our tracker list, we will trim it to eTLD+1 (remove path and subdomain information)
 *   - In all other cases (the general case), the header will be modified to only the referrer origin (includes subdomain).
 */
const referrerListenerOptions = ['blocking', 'requestHeaders']
if (browserName !== 'moz') {
    referrerListenerOptions.push('extraHeaders') // Required in chrome type browsers to receive referrer information
}

chrome.webRequest.onBeforeSendHeaders.addListener(
    function limitReferrerData (e) {
        let referrer = e.requestHeaders.find(header => header.name.toLowerCase() === 'referer')
        if (referrer) {
            referrer = referrer.value
        } else {
            return
        }

        // Check if origin is safe listed
        const tab = tabManager.get({ tabId: e.tabId })

        // Firefox only - Check if this tab had a surrogate redirect request and if it will
        // likely be blocked by CORS (Origin header). Chrome surrogate redirects happen in onBeforeRequest.
        if (browserName === 'moz' && tab && tab.surrogates && tab.surrogates[e.url]) {
            const hasOrigin = e.requestHeaders.filter(h => h.name.match(/^origin$/i))
            if (!hasOrigin.length) {
                const redirectUrl = tab.surrogates[e.url]
                // remove redirect entry for the tab
                delete tab.surrogates[e.url]

                return { redirectUrl }
            }
        }

        // Safe list and broken site list checks are included in the referrer evaluation
        const modifiedReferrer = trackerutils.truncateReferrer(referrer, e.url)
        if (!modifiedReferrer) {
            return
        }

        const requestHeaders = e.requestHeaders.filter(header => header.name.toLowerCase() !== 'referer')
        if (!!tab && (!tab.referrer || tab.referrer.site !== tab.site.url)) {
            tab.referrer = {
                site: tab.site.url,
                referrerHost: new URL(referrer).hostname,
                referrer: modifiedReferrer
            }
        }
        requestHeaders.push({
            name: 'referer',
            value: modifiedReferrer
        })
        return { requestHeaders: requestHeaders }
    },
    { urls: ['<all_urls>'] },
    referrerListenerOptions
)

/**
 * Global Privacy Control
 */
const GPC = require('./GPC.es6')

const extraInfoSpecSendHeaders = ['blocking', 'requestHeaders']
if (chrome.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS) {
    extraInfoSpecSendHeaders.push(chrome.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS)
}
// Attach GPC header to all requests if enabled.
chrome.webRequest.onBeforeSendHeaders.addListener(
    request => {
        const GPCHeader = GPC.getHeader()

        let requestHeaders = request.requestHeaders
        if (GPCHeader) {
            requestHeaders.push(GPCHeader)
        }

        if (blockTrackingCookies()) {
            if (!trackerutils.isTracker(request.url)) {
                return { requestHeaders }
            }

            // Strip 3rd party response header
            const tab = tabManager.get({ tabId: request.tabId })
            if (!requestHeaders) return { requestHeaders }
            if (tab && tab.site.whitelisted) return { requestHeaders }
            if (!tab) {
                const initiator = request.initiator || request.documentUrl
                if (!initiator || trackerutils.isFirstPartyByEntity(initiator, request.url)) {
                    return { requestHeaders }
                }
            } else if (tab && trackerutils.isFirstPartyByEntity(request.url, tab.url)) {
                return { requestHeaders }
            }
            if (!cookieConfig.isExcluded(request.url)) {
                requestHeaders = requestHeaders.filter(header => header.name.toLowerCase() !== 'cookie')
            }
        }

        return { requestHeaders: requestHeaders }
    },
    { urls: ['<all_urls>'] },
    extraInfoSpecSendHeaders
)

/**
 * Click to Load
 */

/*
 * On FireFox, redirecting to a JS surrogate in some cases causes a CORS error. Determine if that is the case here.
 * If so, and we have an alternate XRAY surrogate implementation, inject it.
 */
chrome.webRequest.onBeforeRedirect.addListener(
    details => {
        const tab = tabManager.get({ tabId: details.tabId })
        if (tab && !tab.site.isBroken && !tab.site.whitelisted && details.responseHeaders && trackerutils.facebookExperimentIsActive()) {
            // Detect cors error
            const headers = details.responseHeaders
            const corsHeaders = [
                'Access-Control-Allow-Origin'
            ]
            const corsFound = headers.filter(v => corsHeaders.includes(v.name)).length

            if (corsFound && details.redirectUrl) {
                const xray = trackerutils.getXraySurrogate(details.redirectUrl)
                if (xray && utils.getBrowserName() === 'moz') {
                    console.log('Normal surrogate load failed, loading XRAY version')
                    chrome.tabs.executeScript(details.tabId, {
                        file: `public/js/content-scripts/${xray}`,
                        matchAboutBlank: true,
                        frameId: details.frameId,
                        runAt: 'document_start'
                    })
                }
            }
        }
    },
    { urls: ['<all_urls>'] },
    ['responseHeaders']
)

// Inject our content script to overwite FB elements
chrome.webNavigation.onCommitted.addListener(details => {
    const tab = tabManager.get({ tabId: details.tabId })
    if (tab && tab.site.isBroken) {
        console.log('temporarily skip embedded object replacements for site: ' + details.url +
          'more info: https://github.com/duckduckgo/content-blocking-lists')
        return
    }

    if (tab && !tab.site.whitelisted && trackerutils.facebookExperimentIsActive()) {
        chrome.tabs.executeScript(details.tabId, {
            file: 'public/js/content-scripts/click-to-load.js',
            matchAboutBlank: true,
            frameId: details.frameId,
            runAt: 'document_start'
        })
    }
})

/**
 * ALARMS
 */

const httpsStorage = require('./storage/https.es6')
const httpsService = require('./https-service.es6')
const tdsStorage = require('./storage/tds.es6')
const trackers = require('./trackers.es6')

// recheck tracker and https lists every 12 hrs
chrome.alarms.create('updateHTTPSLists', { periodInMinutes: 12 * 60 })
// tracker lists / content blocking lists are 30 minutes
chrome.alarms.create('updateLists', { periodInMinutes: 30 })
// update uninstall URL every 10 minutes
chrome.alarms.create('updateUninstallURL', { periodInMinutes: 10 })
// remove expired HTTPS service entries
chrome.alarms.create('clearExpiredHTTPSServiceCache', { periodInMinutes: 60 })
// Update userAgent lists
chrome.alarms.create('updateUserAgentData', { periodInMinutes: 30 })
// Rotate the user agent spoofed
chrome.alarms.create('rotateUserAgent', { periodInMinutes: 24 * 60 })
// Rotate the sessionKey
chrome.alarms.create('rotateSessionKey', { periodInMinutes: 24 * 60 })

chrome.alarms.onAlarm.addListener(alarmEvent => {
    if (alarmEvent.name === 'updateHTTPSLists') {
        settings.ready().then(() => {
            httpsStorage.getLists(constants.httpsLists)
                .then(lists => https.setLists(lists))
                .catch(e => console.log(e))
        })
    } else if (alarmEvent.name === 'updateUninstallURL') {
        chrome.runtime.setUninstallURL(ATB.getSurveyURL())
    } else if (alarmEvent.name === 'updateLists') {
        settings.ready().then(() => {
            https.sendHttpsUpgradeTotals()
        })

        tdsStorage.getLists()
            .then(lists => trackers.setLists(lists))
            .catch(e => console.log(e))
    } else if (alarmEvent.name === 'clearExpiredHTTPSServiceCache') {
        httpsService.clearExpiredCache()
    } else if (alarmEvent.name === 'updateUserAgentData') {
        settings.ready()
            .then(() => {
                cookieConfig.updateCookieData()
            }).catch(e => console.log(e))
    } else if (alarmEvent.name === 'rotateSessionKey') {
        // TODO fix for manifest v3
        sessionKey = getHash()
    } else if (alarmEvent.name === REFETCH_ALIAS_ALARM) {
        fetchAlias()
    }
})

/**
 * on start up
 */
const onStartup = () => {
    chrome.tabs.query({ currentWindow: true, status: 'complete' }, function (savedTabs) {
        for (let i = 0; i < savedTabs.length; i++) {
            const tab = savedTabs[i]

            if (tab.url) {
                tabManager.create(tab)
            }
        }
    })

    settings.ready().then(async () => {
        experiment.setActiveExperiment()

        httpsStorage.getLists(constants.httpsLists)
            .then(lists => https.setLists(lists))
            .catch(e => console.log(e))

        tdsStorage.getLists()
            .then(lists => trackers.setLists(lists))
            .catch(e => console.log(e))

        https.sendHttpsUpgradeTotals()

        Companies.buildFromStorage()

        cookieConfig.updateCookieData()

        // fetch alias if needed
        const userData = settings.getSetting('userData')
        if (userData && userData.token) {
            if (!userData.nextAlias) await fetchAlias()
            showContextMenuAction()
        }
    })
}

// Fire pixel on https upgrade failures to allow bad data to be removed from lists
chrome.webRequest.onErrorOccurred.addListener(e => {
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
            const url = new URL(e.url)
            pixel.fire('ehd', {
                url: `${encodeURIComponent(url.hostname)}`,
                error: errCode
            })
        }
    }
}, { urls: ['<all_urls>'] })

if (browserName === 'moz') {
    cspProtection.init()
}

module.exports = {
    onStartup: onStartup
}
