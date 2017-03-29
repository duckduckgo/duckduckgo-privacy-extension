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


var blockTrackers = require('blockTrackers');
var utils = require('utils');

var tabs = {};
var isExtensionEnabled = true;
var isSocialBlockingEnabled = false;

function Background() {
  $this = this;


  // clearing last search on browser startup
  localStorage['last_search'] = '';

  var os = "o";
  if (window.navigator.userAgent.indexOf("Windows") != -1) os = "w";
  if (window.navigator.userAgent.indexOf("Mac") != -1) os = "m";
  if (window.navigator.userAgent.indexOf("Linux") != -1) os = "l";

  localStorage['os'] = os;

  chrome.tabs.query({currentWindow: true, status: 'complete'}, function(savedTabs){
      console.log(savedTabs);
      for(var i = 0; i < savedTabs.length; i++){ 
          var tab = savedTabs[i];
          if(tab.url){
            console.log(tab);
            tabs[tab.id] = {'trackers': {}, "total": 0, 'url': tab.url};
          }
      }
  });

  chrome.runtime.onInstalled.addListener(function(details) {
    // only run the following section on install
    if (details.reason !== "install") {
      return;
    }  

    if (localStorage['blocking'] === undefined) {
        localStorage['blocking'] = 'true';
    }

    if (localStorage['atb'] === undefined) {
        var oneWeek = 604800000,
            oneDay = 86400000,
            oneHour = 3600000,
            oneMinute = 60000,
            estEpoch = 1456290000000,
            localDate = new Date(),
            localTime = localDate.getTime(),
            utcTime = localTime + (localDate.getTimezoneOffset() * oneMinute),
            est = new Date(utcTime + (oneHour * -5)),
            dstStartDay = 13 - ((est.getFullYear() - 2016) % 6),
            dstStopDay = 6 - ((est.getFullYear() - 2016) % 6),
            isDST = (est.getMonth() > 2 || (est.getMonth() == 2 && est.getDate() >= dstStartDay)) && (est.getMonth() < 10 || (est.getMonth() == 10 && est.getDate() < dstStopDay)),
            epoch = isDST ? estEpoch - oneHour : estEpoch,
            timeSinceEpoch = new Date().getTime() - epoch,
            majorVersion = Math.ceil(timeSinceEpoch / oneWeek),
            minorVersion = Math.ceil(timeSinceEpoch % oneWeek / oneDay);

        localStorage['atb'] = 'v' + majorVersion + '-' + minorVersion;
    }

    // inject the oninstall script to opened DuckDuckGo tab.
    chrome.tabs.query({ url: 'https://*.duckduckgo.com/*' }, function (tabs) {
      var i = tabs.length, tab;
      while (i--) {
        tab = tabs[i];
        chrome.tabs.executeScript(tab.id, {
          file: 'js/oninstall.js'
        });
        chrome.tabs.insertCSS(tab.id, {
          file: 'css/noatb.css'
        });
      }
    });
    
    if (!chrome.extension.inIncognitoContext) {
        chrome.tabs.create({
            url: "/html/intro.html"
        });
    }
  });

  chrome.extension.onMessage.addListener(function(request, sender, callback) {
    if (request.options) {
      callback(localStorage);
    }

    if (request.current_url) {
      chrome.tabs.getSelected(function(tab) {
        var url = tab.url;
        callback(url);
      });
    }

    if (request.whitelist) {
      var toWhitelist = blockTrackers.extractHostFromURL(request.whitelist);
      console.log("WHITELIST: " + toWhitelist);
      chrome.tabs.query({
        'currentWindow': true,
        'active': true
      }, function(currentTabs) {
        var tabId = currentTabs[0].id;
        if (!tabs[tabId]) {
            tabs[tabId] = {'trackers': {}, "total": 0, 'url': tab.url};
        }

        if (!tabs[tabId].whitelist) {
            tabs[tabId].whitelist = [];
        }
        
        tabs[tabId].whitelist.push(toWhitelist);
      });
    }

    if (!localStorage['set_atb'] && request.atb) {
      localStorage['atb'] = request.atb;
      localStorage['set_atb'] = request.atb;
    }

    return true;
  });
}

var background = new Background();

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

//This adds Context Menu when user select some text.
//create context menu
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

// Add ATB param
chrome.webRequest.onBeforeRequest.addListener(
    function (e) {

      // Add ATB for DDG URLs, otherwise block trackers
      if (e.url.search('/duckduckgo\.com') !== -1) {
          // Only change the URL if there is no ATB param specified.
          if (e.url.indexOf('atb=') !== -1) {
            return;
          }

          // Only change the URL if there is an ATB saved in localStorage
          if (localStorage['atb'] === undefined) {
            return;
          }
        
          var newURL = e.url + "&atb=" + localStorage['atb'];
          return {
            redirectUrl: newURL
          };
      } 
      else {

          if(e.type === 'main_frame'){
              delete tabs[e.tabId];
          }

          if(!tabs[e.tabId]){
              tabs[e.tabId] = {'trackers': {}, "total": 0, 'url': e.url}
          }

          if(!isExtensionEnabled){
              return;
          }

          if (!tabs[e.tabId].whitelist || (tabs[e.tabId].whitelist.indexOf(tabs[e.tabId].url) === -1)) {
              var block =  blockTrackers.blockTrackers(e.url, tabs[e.tabId].url);

              if(block){
                var name = block.tracker;

                if(!tabs[e.tabId]){
                    tabs[e.tabId] = {'trackers': {}, "total": 0};
                }

                if(!tabs[e.tabId]['trackers'][name]){
                    tabs[e.tabId]['trackers'][name] = {'count': 1, 'url': block.url};
                }
                else {
                    tabs[e.tabId]['trackers'][name].count += 1;
                }
                tabs[e.tabId]['total'] += 1;

                tabs[e.tabId]['dispTotal'] = Object.keys(tabs[e.tabId].trackers).length;

                updateBadge(e.tabId, tabs[e.tabId].dispTotal);

                return {cancel: true};
              }
          }
      }
    },
    {
        urls: [
            "<all_urls>",
        ],
        types: [
        'main_frame',
        'sub_frame',
        'stylesheet',
        'script',
        'image',
        'object',
        'xmlhttprequest',
        'other'
      ]
    },
    ["blocking"]
);

function updateBadge(tabId, numBlocked){
    if(numBlocked === 0){
        chrome.browserAction.setBadgeBackgroundColor({tabId: tabId, color: "#00cc00"});
    } 
    else {
        chrome.browserAction.setBadgeBackgroundColor({tabId: tabId, color: "#cc0000"});
    }
    chrome.browserAction.setBadgeText({tabId: tabId, text: numBlocked + ""});
}

chrome.tabs.onReplaced.addListener(function (addedTabId) {
    chrome.tabs.get(addedTabId, function(tab) {
        //tabs[tab.id] = {'trackers': {}, "total": 0, 'url': tab.url};
        //chrome.browserAction.setBadgeText({tabId: tab.id, text: localStorage[tab.url] + ""});
    });
});

chrome.tabs.onUpdated.addListener(function(id, info, tab) {
    if(tabs[id] && info.status === "loading" && tabs[id].status !== "loading"){
        tabs[id] = {'trackers': {}, "total": 0, 'url': tab.url, "status": "loading"};
    }
    else if(tabs[id] && info.status === "complete"){
        tabs[id].status = "complete";
    }

});

chrome.tabs.onRemoved.addListener(function(id, info) {
    delete tabs[id];
});

chrome.webRequest.onCompleted.addListener(
      function () {
          var atb = localStorage['atb'],
              setATB = localStorage['set_atb'];

          if (!atb || !setATB) {
            return;
          }

          var xhr = new XMLHttpRequest();

          xhr.onreadystatechange = function() {
            if (xhr.readyState == XMLHttpRequest.DONE) {
               if (xhr.status == 200) {
                 var curATB = JSON.parse(xhr.responseText);
                 if(curATB.version !== setATB) {
                   localStorage['set_atb'] = curATB.version;
                 }
               }
            }
          };

          xhr.open('GET',
            'https://duckduckgo.com/atb.js?' + Math.ceil(Math.random() * 1e7)
              + '&atb=' + atb + '&set_atb=' + setATB,
            true
          );
          xhr.send();
    },
    {
        urls: [
            "*://duckduckgo.com/?*",
            "*://*.duckduckgo.com/?*"
        ]
    }
);

