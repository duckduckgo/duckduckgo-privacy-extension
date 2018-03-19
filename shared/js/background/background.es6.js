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
const trackers = require('./trackers.es6')
const utils = require('./utils.es6')
const settings = require('./settings.es6')
const https = require('./https.es6')
const surrogates = require('./surrogates.es6')
const tabManager = require('./tab-manager.es6')
const Companies = require('./companies.es6')
const ATB = require('./atb.es6')
const redirect = require('./redirect.es6')
const constants = require('../../data/constants')

// popup will ask for the browser type then it is created
chrome.runtime.onMessage.addListener((req, sender, res) => {
    if (req.getBrowser) {
        res(utils.getBrowserName());
    }
    return true;
});

function Background() {
  // clearing last search on browser startup
  settings.updateSetting('last_search', '')

  var os = "o";
  if (window.navigator.userAgent.indexOf("Windows") != -1) os = "w";
  if (window.navigator.userAgent.indexOf("Mac") != -1) os = "m";
  if (window.navigator.userAgent.indexOf("Linux") != -1) os = "l";

  localStorage['os'] = os;

  chrome.tabs.query({currentWindow: true, status: 'complete'}, function(savedTabs){
      for (var i = 0; i < savedTabs.length; i++){
          var tab = savedTabs[i];

          if (tab.url) {
              let newTab = tabManager.create(tab);
              // check https status of saved tabs so we have the correct site score
              if (newTab.url.match(/^https:\/\//)) {
                  newTab.site.score.update({hasHTTPS: true})
              }
          }
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

chrome.webRequest.onBeforeRequest.addListener(
    redirect.handleRequest,
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
