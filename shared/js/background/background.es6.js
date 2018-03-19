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

const chromeEvents = require('./chrome-events.es6')
const settings = require('./settings.es6')
const tabManager = require('./tab-manager.es6')

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
