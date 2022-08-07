import browser from 'webextension-polyfill'
const tldts = require('tldts')

const utils = require('./utils.es6')
const trackers = require('./trackers.es6')
const trackerutils = require('./tracker-utils')
const https = require('./https.es6')
const Companies = require('./companies.es6')
const tabManager = require('./tab-manager.es6')
const ATB = require('./atb.es6')
const browserWrapper = require('./wrapper.es6')
const settings = require('./settings.es6')
const devtools = require('./devtools.es6')
const trackerAllowlist = require('./allowlisted-trackers.es6')
const {
    stripTrackingParameters,
    trackingParametersStrippingEnabled
} = require('./url-parameters.es6')
const ampProtection = require('./amp-protection.es6')

function buildResponse (url, requestData, tab, isMainFrame) {
    if (url.toLowerCase() !== requestData.url.toLowerCase()) {
        console.log('HTTPS: upgrade request url to ' + url)
        tab.httpsRedirects.registerRedirect(requestData)

        if (isMainFrame) {
            tab.upgradedHttps = true
        }
        if (utils.getUpgradeToSecureSupport()) {
            return { upgradeToSecure: true }
        } else {
            return { redirectUrl: url }
        }
    } else if (isMainFrame) {
        tab.upgradedHttps = false
    }
}

function updateTabCleanAmpUrl (currentTab, canonicalUrl, url) {
    if (currentTab) {
        currentTab.cleanAmpUrl = canonicalUrl || url
    }
}

async function handleAmpAsyncRedirect (thisTab, url) {
    const canonicalUrl = await ampProtection.fetchAMPURL(thisTab.site, url)
    const currentTab = tabManager.get({ tabId: thisTab.id })
    updateTabCleanAmpUrl(currentTab, canonicalUrl, url)
    if (canonicalUrl) {
        return { redirectUrl: canonicalUrl }
    }
}

async function handleAmpDelayedUpdate (thisTab, url) {
    const canonicalUrl = await ampProtection.fetchAMPURL(thisTab.site, url)
    const currentTab = tabManager.get({ tabId: thisTab.id })
    const newUrl = canonicalUrl || url
    updateTabCleanAmpUrl(currentTab, canonicalUrl, url)

    browser.tabs.update(thisTab.id, { url: newUrl })
}

function handleAmpRedirect (thisTab, url) {
    if (!thisTab) { return }
    if (utils.getBrowserName() === 'moz') {
        return handleAmpAsyncRedirect(thisTab, url)
    }

    handleAmpDelayedUpdate(thisTab, url)
    return { redirectUrl: 'about:blank' }
}

/**
 * Where most of the extension work happens.
 *
 * For each request made:
 * - Add ATB param
 * - Block tracker requests
 * - Upgrade http -> https where possible
 * @param {import('webextension-polyfill').WebRequest.OnBeforeRedirectDetailsType} requestData
 */
function handleRequest (requestData) {
    const tabId = requestData.tabId
    // Skip requests to background tabs
    if (tabId === -1) { return }

    let thisTab = tabManager.get(requestData)

    // control access to web accessible resources
    if (requestData.url.startsWith(browserWrapper.getExtensionURL('/web_accessible_resources'))) {
        if (!thisTab || !thisTab.hasWebResourceAccess(requestData.url)) {
            return { cancel: true }
        }
    }

    // For main_frame requests: create a new tab instance whenever we either
    // don't have a tab instance for this tabId or this is a new requestId.
    if (requestData.type === 'main_frame') {
        if (!thisTab || thisTab.requestId !== requestData.requestId) {
            const newTab = tabManager.create(requestData)

            // persist the last URL the tab was trying to upgrade to HTTPS
            if (thisTab && thisTab.httpsRedirects) {
                newTab.httpsRedirects.persistMainFrameRedirect(thisTab.httpsRedirects.getMainFrameRedirect())
            }
            thisTab = newTab
        }

        let mainFrameRequestURL = new URL(requestData.url)

        // AMP protection
        const canonUrl = ampProtection.extractAMPURL(thisTab.site, mainFrameRequestURL.href)
        if (canonUrl) {
            thisTab.setAmpUrl(mainFrameRequestURL.href)
            updateTabCleanAmpUrl(thisTab, canonUrl, mainFrameRequestURL.href)
            mainFrameRequestURL = new URL(canonUrl)
        } else if (ampProtection.tabNeedsDeepExtraction(requestData, thisTab, mainFrameRequestURL)) {
            thisTab.setAmpUrl(mainFrameRequestURL.href)
            return handleAmpRedirect(thisTab, mainFrameRequestURL.href)
        } else if (thisTab.cleanAmpUrl && mainFrameRequestURL.host !== new URL(thisTab.cleanAmpUrl).host) {
            thisTab.ampUrl = null
            thisTab.cleanAmpUrl = null
        }

        const ampRedirected = thisTab.ampUrl &&
                              thisTab.cleanAmpUrl && thisTab.cleanAmpUrl !== thisTab.ampUrl &&
                              requestData.url === thisTab.ampUrl

        // Tracking parameter stripping.

        thisTab.urlParametersRemoved = (
            // Tracking parameters were stripped previously, this is the request
            // event that fired after the redirection to strip the parameters.
            thisTab.urlParametersRemovedUrl &&
            thisTab.urlParametersRemovedUrl === requestData.url
        ) || (
            // Strip tracking parameters if 1. there are any and 2. the feature
            // is enabled for both the request URL and the initiator URL.
            trackingParametersStrippingEnabled(
                thisTab.site, (requestData.initiator || requestData.originUrl)
            ) && stripTrackingParameters(mainFrameRequestURL)
        )

        // To strip tracking parameters, the request is redirected and this event
        // listener fires again for the redirected request. Take note of the URL
        // before redirecting the request, so that  the `urlParametersRemoved`
        // breakage flag persists after the redirection.
        if (thisTab.urlParametersRemoved && !thisTab.urlParametersRemovedUrl) {
            thisTab.urlParametersRemovedUrl = mainFrameRequestURL.href
        } else {
            thisTab.urlParametersRemovedUrl = null
        }

        // add atb params only to main_frame
        // @ts-ignore addParametersMainFrameRequestUrl is exported but TS doesn't know about it
        const atbParametersAdded = ATB.addParametersMainFrameRequestUrl(mainFrameRequestURL)

        if (thisTab.urlParametersRemoved || ampRedirected || atbParametersAdded) {
            return { redirectUrl: mainFrameRequestURL.href }
        }
    } else {
        /**
         * Check that we have a valid tab
         * there is a chance this tab was closed before
         * we got the webrequest event
         */
        if (!(thisTab && thisTab.url && thisTab.id)) return

        // skip blocking on new tab and extension pages
        if (thisTab.site.specialDomainName) {
            return
        }

        const handleResponse = blockHandleResponse(thisTab, requestData)
        if (handleResponse) {
            return handleResponse
        }
    }

    /**
     * HTTPS Everywhere rules
     * If an upgrade rule is found, request is upgraded from http to https
     */

    if (!thisTab.site) return

    // Skip https upgrade on broken sites
    if (thisTab.site.isBroken) {
        console.log('temporarily skip https upgrades for site: ' +
              utils.extractHostFromURL(thisTab.url) + '\n' +
              'more info: https://github.com/duckduckgo/privacy-configuration')
        return
    }

    // Is this request from the tab's main frame?
    const isMainFrame = requestData.type === 'main_frame'
    const isPost = requestData.method === 'POST'

    // Skip https upgrade if host failed before or if we detect redirect loop
    if (!thisTab.httpsRedirects.canRedirect(requestData)) {
        if (isMainFrame) {
            thisTab.upgradedHttps = false
        }
        return
    }

    // Fetch upgrade rule from https module:
    const resultUrl = https.getUpgradedUrl(requestData.url, thisTab, isMainFrame, isPost)

    if (resultUrl instanceof Promise) {
        return resultUrl.then(url => buildResponse(url, requestData, thisTab, isMainFrame))
    } else {
        return buildResponse(resultUrl, requestData, thisTab, isMainFrame)
    }
}

/**
 * Tracker blocking
 * If request is a tracker, cancel the request
 * @param {import('./classes/tab.es6')} thisTab
 * @param {import('webextension-polyfill').WebRequest.OnBeforeRedirectDetailsType} requestData
 * @returns {browser.WebRequest.BlockingResponseOrPromise | undefined}
 */
function blockHandleResponse (thisTab, requestData) {
    const tabId = requestData.tabId
    const blockingEnabled = thisTab.site.isContentBlockingEnabled()

    const tracker = trackers.getTrackerData(requestData.url, thisTab.site.url, requestData)

    /**
     * Click to Load Blocking
     */
    if (utils.getClickToPlaySupport(thisTab)) {
        const socialTracker = trackerutils.getSocialTracker(requestData.url)
        const isConsiderableForClickToPlay = tracker && ['block', 'ignore', 'redirect'].includes(tracker.action)
        if (isConsiderableForClickToPlay && socialTracker && trackerutils.shouldBlockSocialNetwork(socialTracker.entity, thisTab.site.url)) {
            if (!trackerutils.isSameEntity(requestData.url, thisTab.site.url) && // first party
                !thisTab.site.clickToLoad.includes(socialTracker.entity)) {
                // TDS doesn't block social sites by default, so update the action & redirect for click to load.
                tracker.action = 'block'
                if (socialTracker.redirectUrl) {
                    tracker.action = 'redirect'
                    tracker.reason = 'matched rule - surrogate'
                    tracker.redirectUrl = socialTracker.redirectUrl
                    if (!tracker.matchedRule) {
                        // @ts-ignore
                        tracker.matchedRule = {}
                    }
                    // @ts-ignore
                    tracker.matchedRule.surrogate = socialTracker.redirectUrl
                }
            } else {
                // Social tracker has been 'clicked'. we don't want to block any more requests to these properties.
                return
            }
        }
    }

    if (tracker) {
        // temp allowlisted trackers to fix site breakage
        if (thisTab.site.isFeatureEnabled('trackerAllowlist')) {
            const allowListed = trackerAllowlist(thisTab.site.url, requestData.url)

            if (allowListed) {
                console.log(`Allowlisted: ${requestData.url} Reason: ${allowListed.reason}`)
                tracker.action = 'ignore'
                tracker.reason = `tracker allowlist - ${allowListed.reason}`
            }
        }

        // ad click attribution
        if (thisTab.allowAdAttribution(requestData.url)) {
            tracker.action = 'ad-attribution'
            tracker.reason = 'tracker allowlist - ad click'
        }

        if (!blockingEnabled && (tracker.action === 'block' || tracker.action === 'redirect')) {
            tracker.action = 'ignore'
            tracker.reason = 'content blocking disabled'
        }

        // allow embedded twitter content if user enabled this setting
        if (tracker.fullTrackerDomain === 'platform.twitter.com' && settings.getSetting('embeddedTweetsEnabled') === true) {
            tracker.action = 'ignore'
            tracker.reason = 'embedded tweets allowed'
        }

        const reportedTracker = { ...tracker }
        const cleanUrl = new URL(requestData.url)
        cleanUrl.search = ''
        cleanUrl.hash = ''
        // @ts-ignore
        devtools.postMessage(tabId, 'tracker', {
            tracker: {
                ...reportedTracker,
                matchedRule: reportedTracker.matchedRule?.rule?.toString()
            },
            url: cleanUrl,
            requestData,
            siteUrl: thisTab.site.url
        })

        // Count and block trackers.

        // Determine if this tracker was coming from our current tab. There can be cases where a tracker request
        // comes through on document unload and by the time we block it we have updated our tab data to the new
        // site. This can make it look like the tracker was on the new site we navigated to. We're blocking the
        // request anyway but deciding to show it in the popup or not. If we have a documentUrl, use it, otherwise
        // just default to true.
        const sameDomainDocument = isSameDomainRequest(thisTab, requestData)
        if (sameDomainDocument) {
            // record all tracker urls on a site even if we don't block them
            thisTab.site.addTracker(tracker)

            // record potential blocked trackers for this tab
            thisTab.addToTrackers(tracker)
        }
        // update badge icon for any requests that come in after
        // the tab has finished loading
        if (thisTab.status === 'complete') thisTab.updateBadgeIcon()
        browserWrapper.notifyPopup({ updateTabData: true })
        // Block the request if the site is not allowlisted
        if (['block', 'redirect'].includes(tracker.action)) {
            // @ts-ignore
            Companies.add(tracker.tracker.owner)
            if (sameDomainDocument) thisTab.addOrUpdateTrackersBlocked(tracker)

            console.info('blocked ' + utils.extractHostFromURL(thisTab.url) +
                        // @ts-ignore
                        ' [' + tracker.tracker.owner.name + '] ' + requestData.url)

            // return surrogate redirect if match, otherwise
            // tell Chrome to cancel this webrequest
            if (tracker.redirectUrl && tracker.matchedRule) {
                const webResource = browserWrapper.getExtensionURL(`web_accessible_resources/${tracker.matchedRule.surrogate}`)

                // Firefox: check these for Origin headers in onBeforeSendHeaders before redirecting or not. Workaround for
                // https://bugzilla.mozilla.org/show_bug.cgi?id=1694679
                // Surrogates that for sure need to load should have 'strictRedirect' set, and will have their headers checked
                // in onBeforeSendHeaders
                if (tracker.matchedRule.strictRedirect && utils.getBrowserName() === 'moz') {
                    thisTab.surrogates[requestData.url] = webResource
                } else {
                    const key = thisTab.addWebResourceAccess(webResource)
                    return { redirectUrl: `${webResource}?key=${key}` }
                }
            } else {
                return { cancel: true }
            }
        }
    }

    /**
     * Notify skipping for broken sites
     */
    if (thisTab.site.isBroken) {
        console.log('temporarily skip tracker blocking for site: ' +
            utils.extractHostFromURL(thisTab.url) + '\n' +
            'more info: https://github.com/duckduckgo/privacy-configuration')
    }

    // If we didn't block this script and it's a tracker, notify the content script.
    if (requestData.type === 'script' && tracker && !tracker.sameEntity) {
        utils.sendTabMessage(requestData.tabId, {
            type: 'update',
            trackerDefinition: true,
            hostname: tldts.parse(requestData.url).hostname
        }, {
            frameId: requestData.frameId
        })
    }
}

/* Check to see if a request came from our current tab. This generally handles the
 * case of pings that fire on document unload. We can get into a case where we count the
 * ping to the new site we navigated to.
 *
 * In Firefox we can check the request frameAncestors to see if our current
 * tab url is one of the ancestors.
 * In Chrome we don't have access to a sub_frame ancestors. We can check that a request
 * is coming from the main_frame and that it matches our current tab url
 */
function isSameDomainRequest (tab, req) {
    // Firefox
    if (req.documentUrl) {
        if (req.frameAncestors && req.frameAncestors.length) {
            const ancestors = req.frameAncestors.reduce((lst, f) => {
                lst.push(f.url)
                return lst
            }, [])
            return ancestors.includes(tab.url)
        } else {
            return req.documentUrl === tab.url
        }
    // Chrome
    } else if (req.initiator && req.frameId === 0) {
        return !!tab.url.match(req.initiator)
    } else {
        return true
    }
}

exports.handleRequest = handleRequest
