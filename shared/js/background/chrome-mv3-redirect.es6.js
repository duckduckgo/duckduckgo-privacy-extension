const utils = require('./utils.es6')
const trackers = require('./trackers.es6')
const https = require('./https.es6')
const Companies = require('./companies.es6')
const tabManager = require('./tab-manager.es6')
const browserWrapper = require('./$BROWSER-wrapper.es6')
const settings = require('./settings.es6')
const {addToHTTPSafelist} = require('./dynamic-rules.es6')

const debugRequest = false

function downgrade (tabManagerTab, url) {
    const httpUrl = new URL(url)
    httpUrl.protocol = 'http:'
    const httpsUrl = new URL(url)
    httpsUrl.protocol = 'https:'

    const tabId = tabManagerTab.id

    return addToHTTPSafelist(httpUrl)
        .then(() => {
            let tabUrl = null
            try {
                tabUrl = new URL(tabManagerTab.url)
            } catch (e) {
                throw new Error('Invalid URL.')
            }

            // we want to make sure that user hasn't navigated away from the page before we downgrade it
            if (tabUrl && tabUrl.hostname === httpUrl.hostname && tabUrl.pathname === httpUrl.pathname) {
                console.info('Redirecting to page', httpUrl.toString())

                setTimeout(() => {
                    chrome.tabs.update(tabId, {url: httpUrl.toString()})
                }, 25)
            } else {
                console.warn(`Tab ${tabId} changed URL or was closed before upgrade.`, httpsUrl.toString(), tabUrl)
                throw new Error('URL changed.')
            }
        })
}

function tryElementHide (requestData, tab) {
    if (tab.site.parentEntity === 'Verizon Media') {
        let frameId, messageType

        if (requestData.type === 'sub_frame') {
            frameId = requestData.parentFrameId
            messageType = frameId === 0 ? 'blockedFrame' : 'blockedFrameAsset'
        } else if (requestData.frameId !== 0 && (requestData.type === 'image' || requestData.type === 'script')) {
            frameId = requestData.frameId
            messageType = 'blockedFrameAsset'
        }

        chrome.tabs.sendMessage(requestData.tabId, {type: messageType, request: requestData, mainFrameUrl: tab.url}, {frameId: frameId})
    } else if (!tab.elementHidingDisabled) {
        chrome.tabs.sendMessage(requestData.tabId, {type: 'disable'})
        tab.elementHidingDisabled = true
    }
}

/* Check to see if a request came from our current tab. This generally handles the
 * case of pings that fire on document unload. We can get into a case where we count the
 * ping to the new site we navigated to.
 * We can check that a request is coming from the main_frame and that it matches our current tab url
 */
function isSameDomainRequest (tab, req) {
    if (req.initiator && req.frameId === 0) {
        return !!tab.url.match(req.initiator)
    } else {
        return true
    }
}

/**
 * - Block tracker requests
 */
function countBlockedRequests (requestData) {
    const tabId = requestData.tabId
    // Skip requests to background tabs
    if (tabId === -1) { return }

    let thisTab = tabManager.get(requestData)

    // For main_frame requests: create a new tab instance whenever we either
    // don't have a tab instance for this tabId or this is a new requestId.
    if (requestData.type === 'main_frame') {
        if (!thisTab || thisTab.requestId !== requestData.requestId) {
            thisTab = tabManager.create(requestData)
        }

        return
    }

    /**
     * Check that we have a valid tab
     * there is a chance this tab was closed before
     * we got the webrequest event
     */
    if (!(thisTab && thisTab.url && thisTab.id)) return

    /**
     * skip any broken sites
     */
    if (thisTab.site.isBroken) {
        console.log('temporarily skip tracker blocking for site: ' +
            utils.extractHostFromURL(thisTab.url) + '\n' +
            'more info: https://github.com/duckduckgo/content-blocking-whitelist')
        return
    }

    // skip blocking on new tab and extension pages
    if (thisTab.site.specialDomainName) {
        return
    }

    /**
     * Tracker blocking
     * If request is a tracker, cancel the request
     */

    let tracker = trackers.getTrackerData(requestData.url, thisTab.site.url, requestData)

    // allow embedded twitter content if user enabled this setting
    if (tracker && tracker.fullTrackerDomain === 'platform.twitter.com' && settings.getSetting('embeddedTweetsEnabled') === true) {
        tracker = null
    }

    // count and block trackers. Skip things that matched in the trackersWhitelist unless they're first party
    if (tracker && !(tracker.action === 'ignore' && tracker.reason !== 'first party')) {
        // Determine if this tracker was coming from our current tab. There can be cases where a tracker request
        // comes through on document unload and by the time we block it we have updated our tab data to the new
        // site. This can make it look like the tracker was on the new site we navigated to. We're blocking the
        // request anyway but deciding to show it in the popup or not. If we have a documentUrl, use it, otherwise
        // just default to true.
        const sameDomain = isSameDomainRequest(thisTab, requestData)

        // only count trackers on pages with 200 response. Trackers on these sites are still
        // blocked below but not counted on the popup. We can also run into a case where
        // we block a tracker faster then we can update the tab so we check sameDomain.
        if (thisTab.statusCode === 200 && sameDomain) {
            // record all tracker urls on a site even if we don't block them
            thisTab.site.addTracker(tracker)

            // record potential blocked trackers for this tab
            thisTab.addToTrackers(tracker)
        }

        browserWrapper.notifyPopup({'updateTabData': true})

        // Block the request if the site is not whitelisted
        if (!thisTab.site.whitelisted && tracker.action.match(/block|redirect/)) {
            if (sameDomain) thisTab.addOrUpdateTrackersBlocked(tracker)

            // update badge icon for any requests that come in after
            // the tab has finished loading
            if (thisTab.status === 'complete') thisTab.updateBadgeIcon()

            if (thisTab.statusCode === 200) {
                Companies.add(tracker.tracker.owner)
            }

            // for debugging specific requests. see test/tests/debugSite.js
            if (debugRequest && debugRequest.length) {
                if (debugRequest.includes(tracker.url)) {
                    console.log('UNBLOCKED: ', tracker.url)
                    return
                }
            }

            // Initiate hiding of blocked ad DOM elements
            tryElementHide(requestData, thisTab)

            console.info(`blocked on ${utils.extractHostFromURL(thisTab.url)}: [${tracker.tracker.owner.name}] ${requestData.url}`)
        }
    }
}

/**
 * - Upgrade http -> https where possible
 */
function verifyRedirect (requestData) {
    const { url, redirectUrl, statusCode } = requestData

    // We are only interested in internal redirects (done by the extension)
    if (statusCode !== 307) {
        console.warn('not a 307 redirect', requestData)
        return
    }

    let fromUrl, toUrl
    try {
        fromUrl = new URL(url)
        toUrl = new URL(redirectUrl)
    } catch (e) {
        console.warn('invalid url', url, redirectUrl)
        // Ingore invalid URLs
        return
    }

    // Ignore if redirect is not from HTTP to HTTPS
    if (fromUrl.protocol !== 'http:' || toUrl.protocol !== 'https:') {
        console.warn('not a http->https change', url, redirectUrl)
        return
    }

    const upgradedFromUrl = new URL(fromUrl)
    upgradedFromUrl.protocol = 'https:'

    // Ignore if redirect changed anything about the request other than the protocol
    if (upgradedFromUrl.toString() !== toUrl.toString()) {
        console.warn('urls don\'t match', url, redirectUrl)
        return
    }

    console.info(`Checking if ${redirectUrl} can continue over HTTPS.`)

    // get information about the tab
    const tabManagerTab = tabManager.get(requestData)

    const isMainFrame = requestData.type === 'main_frame'
    const isPost = requestData.method === 'POST'

    let result = https.getUpgradedUrl(requestData.url, tabManagerTab, isMainFrame, isPost)

    // if returned result is an url, and not a promise, put it into a resolved promise for easier handling
    if (!(result instanceof Promise)) {
        result = Promise.resolve(result)
    }

    result.then(url => {
        if (url.toLowerCase() !== requestData.url.toLowerCase()) {
            console.log('HTTPS: upgrade request url to ' + url)
            tabManagerTab.httpsRedirects.registerRedirect(requestData)

            if (isMainFrame) {
                tabManagerTab.upgradedHttps = true
            }

            console.info(`✅ ${url} - can be upgraded, continue as nothing happened…`)
        } else if (isMainFrame) {
            tabManagerTab.upgradedHttps = false

            console.info(`🔴 ${url} - can't be upgraded.`)

            downgrade(tabManagerTab, url)
        }
    }).catch(e => {
        console.error('Error checking if URL is upgradable', e)
    })
}

exports.countBlockedRequests = countBlockedRequests
exports.verifyRedirect = verifyRedirect
