/*
 * Copyright (C) 2012, 2016 DuckDuckGo, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


var debugRequest = false
var trackers = require('trackers')
var utils = require('utils')
var settings = require('settings')
var stats = require('stats')
var https = require('https')

// Set browser for popup asset paths
// chrome doesn't have getBrowserInfo so we'll default to chrome
// and try to detect if this is firefox
var browser = 'chrome'
try {
    chrome.runtime.getBrowserInfo((info) => {
        if (info.name === 'Firefox') browser = 'moz'
    })
} catch (e) {}

// popup will ask for the browser type then it is created
chrome.runtime.onMessage.addListener((req, sender, res) => {
    if (req.getBrowser) {
        res(browser);
    }
    return true;
});

function Background() {
  $this = this;

  // clearing last search on browser startup
  settings.updateSetting('last_search', '')

  var os = "o";
  if (window.navigator.userAgent.indexOf("Windows") != -1) os = "w";
  if (window.navigator.userAgent.indexOf("Mac") != -1) os = "m";
  if (window.navigator.userAgent.indexOf("Linux") != -1) os = "l";

  localStorage['os'] = os;

  chrome.tabs.query({currentWindow: true, status: 'complete'}, function(savedTabs){
      for(var i = 0; i < savedTabs.length; i++){
          var tab = savedTabs[i];

          if(tab.url){
              let newTab = tabManager.create(tab);
              // check https status of saved tabs so we have the correct site score
              if (newTab.url.match(/^https:\/\//)) {
                  newTab.site.score.update({hasHTTPS: true})
              }
          }
      }
  });

  chrome.runtime.onInstalled.addListener(function(details) {
    // only run the following section on install
    if (details.reason.match(/install|update/)) {
        ATB.onInstalled();
    }

    // blow away old indexeddbs that might be there:
    if (details.reason.match(/update/) && window.indexedDB) {
        const ms = 1000 * 60
        setTimeout(() => window.indexedDB.deleteDatabase('ddgExtension'), ms)
    }
  });
}

var background
settings.ready().then(() => new Background())

chrome.omnibox.onInputEntered.addListener(function(text) {
  chrome.tabs.query({
    'currentWindow': true,
    'active': true
  }, function(tabs) {
    chrome.tabs.update(tabs[0].id, {
      url: "https://duckduckgo.com/?q=" + encodeURIComponent(text) + "&bext=" + localStorage['os'] + "cl"
    });
  });
});

// This adds Context Menu when user select some text.
// Create context menu:
chrome.contextMenus.create({
  title: 'Search DuckDuckGo for "%s"',
  contexts: ["selection"],
  onclick: function(info) {
    var queryText = info.selectionText;
    chrome.tabs.create({
      url: "https://duckduckgo.com/?q=" + queryText + "&bext=" + localStorage['os'] + "cr"
    });
  }
});

/**
 * Before each request:
 * - Add ATB param
 * - Block tracker requests
 * - Upgrade http -> https per HTTPS Everywhere rules
 */
chrome.webRequest.onBeforeRequest.addListener(
    function (requestData) {

        let tabId = requestData.tabId;

        // Skip requests to background tabs
        if (tabId === -1) { return }

        let thisTab = tabManager.get(requestData);

        // For main_frame requests: create a new tab instance whenever we either
        // don't have a tab instance for this tabId or this is a new requestId.
        if (requestData.type === "main_frame") {
            if (!thisTab || (thisTab.requestId !== requestData.requestId)) {
                thisTab = tabManager.create(requestData);
            }

            // add atb params only to main_frame
            let ddgAtbRewrite = ATB.redirectURL(requestData);
            if (ddgAtbRewrite) return ddgAtbRewrite;

        }
        else {

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
                console.log('temporarily skip tracker blocking for site: '
                  + utils.extractHostFromURL(thisTab.url) + '\n'
                  + 'more info: https://github.com/duckduckgo/content-blocking-whitelist')
                return
            }

            /**
             * Tracker blocking
             * If request is a tracker, cancel the request
             */
            chrome.runtime.sendMessage({'updateTabData': true})

            var tracker = trackers.isTracker(requestData.url, thisTab, requestData);

            // count and block trackers. Skip things that matched in the trackersWhitelist
            if (tracker && !(tracker.type === 'trackersWhitelist')) {
                // only count trackers on pages with 200 response. Trackers on these sites are still
                // blocked below but not counted toward company stats
                if (thisTab.statusCode === 200) {
                    // record all tracker urls on a site even if we don't block them
                    thisTab.site.addTracker(tracker)

                    // record potential blocked trackers for this tab
                    thisTab.addToTrackers(tracker)
                }

                // Block the request if the site is not whitelisted
                if (!thisTab.site.whitelisted && tracker.block) {
                    thisTab.addOrUpdateTrackersBlocked(tracker);
                    chrome.runtime.sendMessage({'updateTabData': true})

                    // update badge icon for any requests that come in after
                    // the tab has finished loading
                    if (thisTab.status === "complete") thisTab.updateBadgeIcon()


                    if (tracker.parentCompany !== 'unknown' && thisTab.statusCode === 200){
                        Companies.add(tracker.parentCompany)
                    }

                    // for debugging specific requests. see test/tests/debugSite.js
                    if (debugRequest && debugRequest.length) {
                        if (debugRequest.includes(tracker.url)) {
                            console.log("UNBLOCKED: ", tracker.url)
                            return
                        }
                    }

                    console.info( "blocked " + utils.extractHostFromURL(thisTab.url)
                                 + " [" + tracker.parentCompany + "] " + requestData.url);

                    // tell Chrome to cancel this webrequest
                    return {cancel: true};
                }
            }
        }

        /**
         * HTTPS Everywhere rules
         * If an upgrade rule is found, request is upgraded from http to https
         */

         if (!thisTab.site) return


        // Skip https upgrade on broken sites
        if (thisTab.site.isBroken) {
            console.log('temporarily skip https upgrades for site: '
                  + utils.extractHostFromURL(thisTab.url) + '\n'
                  + 'more info: https://github.com/duckduckgo/content-blocking-whitelist')
            return
        }

        // Avoid redirect loops
        if (thisTab.httpsRedirects[requestData.requestId] >= 7) {
            console.log('HTTPS: cancel https upgrade. redirect limit exceeded for url: \n' + requestData.url)
            return {redirectUrl: thisTab.downgradeHttpsUpgradeRequest(requestData)}
        }

        // Is this request from the tab's main frame?
        const isMainFrame = requestData.type === 'main_frame' ? true : false

        // Fetch upgrade rule from https module:
        const url = https.getUpgradedUrl(requestData.url, thisTab, isMainFrame)
        if (url.toLowerCase() !== requestData.url.toLowerCase()) {
            console.log('HTTPS: upgrade request url to ' + url)
            if (isMainFrame) thisTab.upgradedHttps = true
            thisTab.addHttpsUpgradeRequest(url)
            return {redirectUrl: url}
        } else {
          return
        }
    },
    {
        urls: [
            '<all_urls>',
        ],
        types: constants.requestListenerTypes
    },
    ['blocking']
);

chrome.webRequest.onHeadersReceived.addListener(
        ATB.updateSetAtb,
    {
        urls: [
            '*://duckduckgo.com/?*',
            '*://*.duckduckgo.com/?*'
        ]
    }
);
