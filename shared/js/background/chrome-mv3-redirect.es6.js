const utils = require('./utils.es6')
const trackers = require('./trackers.es6')
const https = require('./https.es6')
const Companies = require('./companies.es6')
const tabManager = require('./tab-manager.es6')
const browserWrapper = require('./$BROWSER-wrapper.es6')
const settings = require('./settings.es6')
const {addToHTTPSafelist} = require('./dynamic-rules.es6')

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
 * Count blocked trackers and trackers that were not blocked due to first-party rule
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

            // Initiate hiding of blocked ad DOM elements
            tryElementHide(requestData, thisTab)

            console.info(`blocked on ${utils.extractHostFromURL(thisTab.url)}: [${tracker.tracker.owner.name}] ${requestData.url}`)
        }
    }
}

/**
 * Make sure that HTTPS upgrade done by declarativeNetRequest rules was valid
 */
function verifyRedirect (requestData) {
    const { tabId, url, redirectUrl, statusCode } = requestData

    // We are only interested in internal redirects (done by the extension)
    if (statusCode !== 307) {
        return
    }

    let fromUrl, toUrl
    try {
        fromUrl = new URL(url)
        toUrl = new URL(redirectUrl)
    } catch (e) {
        // Ingore invalid URLs
        return
    }

    // Ignore if redirect is not from HTTP to HTTPS
    if (fromUrl.protocol !== 'http:' || toUrl.protocol !== 'https:') {
        return
    }

    const upgradedFromUrl = new URL(fromUrl)
    upgradedFromUrl.protocol = 'https:'

    // Ignore if redirect changed anything about the request other than the protocol
    if (upgradedFromUrl.toString() !== toUrl.toString()) {
        return
    }

    console.info(`Checking if ${redirectUrl} can continue over HTTPS.`)

    // get information about the tab
    const tabManagerTab = tabManager.get(requestData)
    const isMainFrame = requestData.type === 'main_frame'
    let isUpgradable = https.canUpgradeUrl(requestData.url)

    // if returned result is an boolean, and not a promise, put it into a resolved promise for easier handling
    if (!(isUpgradable instanceof Promise)) {
        isUpgradable = Promise.resolve(isUpgradable)
    }

    isUpgradable.then(isUpgradableResult => {
        // if url is upgradable and we haven't seen circular redirects in the past
        if (isUpgradableResult && tabManagerTab.httpsRedirects.canRedirect(requestData)) {
            tabManagerTab.httpsRedirects.registerRedirect(requestData)

            if (isMainFrame) {
                tabManagerTab.upgradedHttps = true
                https.incrementUpgradeCount('totalUpgrades')
            }
        } else if (isMainFrame) {
            tabManagerTab.upgradedHttps = false

            addToHTTPSafelist(fromUrl)
                .then(() => {
                    https.downgradeTab({
                        tabId: tabId,
                        expectedUrl: toUrl.toString(),
                        targetUrl: fromUrl.toString()
                    })
                })
        }
    }).catch(e => {
        console.error('Error checking if URL is upgradable', e)
    })
}

exports.countBlockedRequests = countBlockedRequests
exports.verifyRedirect = verifyRedirect
