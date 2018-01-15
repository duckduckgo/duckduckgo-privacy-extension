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


var debugRequest = false;
var trackers = require('trackers');
var utils = require('utils');
var settings = require('settings');
let browser = 'safari'

function Background() {
  $this = this;
}

var background = new Background();

var handleMessage = function (message) {
    if (message.name === 'canLoad') {
        return onBeforeRequest(message)
    }
}

// when the extension first installs, check for any existing tabs
// and create a background tab so we can show the correct site in the popup
function onInstalled () {
    if(!localStorage['installed']) {
        safari.application.browserWindows.forEach((safariWindow) => {
            safariWindow.tabs.forEach((safariTab) => {
                // create a tab id and store in safari tab
                safariTab.ddgTabId = Math.floor(Math.random() * (1000 - 10 + 1)) + 10

                // make a fake request obj so we can use tabManager to handle creating and storing the tab
                let req = {
                    url: safariTab.url,
                    target: safariTab,
                    message: {currentURL: safariTab.url},
                }
                tabManager.create(req)
            })
        })
        localStorage['installed'] = true
    }
}

/** 
 * Before each request:
 * - Add ATB param
 * - Block tracker requests
 * - Upgrade http -> https per HTTPS Everywhere rules
 */
var onBeforeRequest = function (requestData) { 
    let potentialTracker = requestData.message.potentialTracker
    let currentURL = requestData.message.mainFrameURL

    if (!(currentURL && potentialTracker)) return

    //console.log(`REQUEST: page: ${currentURL} tabId: ${requestData.message.tabId} tracker: ${potentialTracker}`)

    // for safari we need to create the tab obj in here. The tab open event doesn't
    // contain any tab specific data for us to do this in tabManager
    
    let tabId = tabManager.getTabId(requestData)
    let thisTab = tabManager.get({tabId: tabId})

    if (!thisTab && requestData.message.frame === 'main_frame') {
        thisTab = tabManager.create(requestData)
        console.log(`CREATED TABID: ${thisTab}`)
    }

    if(thisTab.site.isBroken) {
        console.log('temporarily skip tracker blocking for site: '
                    + utils.extractHostFromURL(thisTab.url) + '\n'
                    + 'more info: https://github.com/duckduckgo/content-blocking-whitelist')
        return
    }

    var tracker = trackers.isTracker(potentialTracker, thisTab, requestData);
    
    if (tracker) {
        thisTab.site.addTracker(tracker)
        thisTab.addToTrackers(tracker)

        if (!thisTab.site.whitelisted && tracker.block) {
            thisTab.addOrUpdateTrackersBlocked(tracker)

            if (tracker.parentCompany !== 'unknown') Companies.add(tracker.parentCompany)

            console.info(`${thisTab.site.domain} [${tracker.parentCompany }] ${tracker.url}`);
            safari.extension.popovers[0].contentWindow.location.reload()
            requestData.message = {cancel: true}
            return
        }
    }   
}

safari.application.addEventListener("message", handleMessage, true);
