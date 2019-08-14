const utils = require('./utils.es6')
const trackers = require('./trackers.es6')
const https = require('./https.es6')
const Companies = require('./companies.es6')
const tabManager = require('./tab-manager.es6')
const ATB = require('./atb.es6')
const browserWrapper = require('./$BROWSER-wrapper.es6')

var debugRequest = false

/**
 * Where most of the extension work happens.
 *
 * For each request made:
 * - Add ATB param
 * - Block tracker requests
 * - Upgrade http -> https where possible
 */

function handleRequest (requestData) {
    let tabId = requestData.tabId
    // Skip requests to background tabs
    if (tabId === -1) { return }

    let thisTab = tabManager.get(requestData)

    // For main_frame requests: create a new tab instance whenever we either
    // don't have a tab instance for this tabId or this is a new requestId.
    //
    // Safari doesn't have specific requests for main frames
    if (requestData.type === 'main_frame' && window.chrome) {
        if (!thisTab || thisTab.requestId !== requestData.requestId) {
            let newTab = tabManager.create(requestData)

            // andrey: temporary disable this. it was letting redirect loops through on Tumblr
            // persist the last URL the tab was trying to upgrade to HTTPS
            // if (thisTab && thisTab.httpsRedirects) {
            //     newTab.httpsRedirects.persistMainFrameRedirect(thisTab.httpsRedirects.getMainFrameRedirect())
            // }
            thisTab = newTab
        }

        // add atb params only to main_frame
        let ddgAtbRewrite = ATB.redirectURL(requestData)
        if (ddgAtbRewrite) return ddgAtbRewrite
    } else {
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

        /**
         * Tracker blocking
         * If request is a tracker, cancel the request
         */

        var tracker = trackers.getTrackerData(requestData.url, thisTab.site.url, requestData)

        // count and block trackers. Skip things that matched in the trackersWhitelist unless they're first party
        if (tracker && !(tracker.action === 'ignore' && tracker.reason !== 'first party')) {
            const sameDomain = thisTab.id === requestData.tabId

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
            if (!thisTab.site.whitelisted && tracker.action === 'block') {
                
                if (sameDomain) thisTab.addOrUpdateTrackersBlocked(tracker)

                // update badge icon for any requests that come in after
                // the tab has finished loading
                if (thisTab.status === 'complete') thisTab.updateBadgeIcon()

                if (tracker.parentCompany !== 'unknown' && thisTab.statusCode === 200) {
                    Companies.add(tracker.tracker.owner)
                }

                // for debugging specific requests. see test/tests/debugSite.js
                if (debugRequest && debugRequest.length) {
                    if (debugRequest.includes(tracker.url)) {
                        console.log('UNBLOCKED: ', tracker.url)
                        return
                    }
                }

                if (!window.safari) {
                    // Initiate hiding of blocked ad DOM elements
                    tryElementHide(requestData, thisTab)
                }

                console.info('blocked ' + utils.extractHostFromURL(thisTab.url) +
                             ' [' + tracker.tracker.owner.name + '] ' + requestData.url)

                // return surrogate redirect if match, otherwise
                // tell Chrome to cancel this webrequest
                if (tracker.redirectUrl) {
                    // safari gets return data in message
                    requestData.message = {redirectUrl: tracker.redirectUrl}
                    return {redirectUrl: tracker.redirectUrl}
                } else {
                    requestData.message = {cancel: true}
                    return {cancel: true}
                }
            }
        }
    }

    /**
     * HTTPS Everywhere rules
     * If an upgrade rule is found, request is upgraded from http to https
     */

    if (!thisTab.site || !window.chrome) return

    // Skip https upgrade on broken sites
    if (thisTab.site.isBroken) {
        console.log('temporarily skip https upgrades for site: ' +
              utils.extractHostFromURL(thisTab.url) + '\n' +
              'more info: https://github.com/duckduckgo/content-blocking-whitelist')
        return
    }

    // Is this request from the tab's main frame?
    const isMainFrame = requestData.type === 'main_frame'

    // Fetch upgrade rule from https module:
    const url = https.getUpgradedUrl(requestData.url, thisTab, isMainFrame)
    if (url.toLowerCase() !== requestData.url.toLowerCase() &&
            thisTab.httpsRedirects.canRedirect(requestData)) {
        console.log('HTTPS: upgrade request url to ' + url)
        thisTab.httpsRedirects.registerRedirect(requestData)

        if (isMainFrame) {
            thisTab.upgradedHttps = true
        }
        if (utils.getUpgradeToSecureSupport()) {
            return {upgradeToSecure: true}
        } else {
            return {redirectUrl: url}
        }
    } else if (isMainFrame) {
        thisTab.upgradedHttps = false
    }
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

exports.handleRequest = handleRequest
