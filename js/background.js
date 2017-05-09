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


var trackers = require('trackers');
var utils = require('utils');
var settings = require('settings');
var load = require('load');
var stats = require('stats');
var tabs = {};

function Background() {
  $this = this;

  // clearing last search on browser startup
  settings.updateSetting('last_search', '');

  var os = "o";
  if (window.navigator.userAgent.indexOf("Windows") != -1) os = "w";
  if (window.navigator.userAgent.indexOf("Mac") != -1) os = "m";
  if (window.navigator.userAgent.indexOf("Linux") != -1) os = "l";

  localStorage['os'] = os;

  chrome.tabs.query({currentWindow: true, status: 'complete'}, function(savedTabs){
      for(var i = 0; i < savedTabs.length; i++){ 
          var tab = savedTabs[i];
          if(tab.url){
            tabs[tab.id] = {'trackers': {}, "total": 0, 'url': tab.url};
          }
      }
  });

  chrome.runtime.onInstalled.addListener(function(details) {
    // only run the following section on install
    if (details.reason !== "install") {
      return;
    }  

    ATB.setInitialVersions();

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

  chrome.runtime.onMessage.addListener(function (request, sender, response) {
    if (typeof(request.social) == 'undefined') {
        return;
    }

    var code_str = 'localStorage["social"] = ' + request.social;
   
    Object.keys(tabs).forEach(function(tabId) {
            if (tabs[tabId].url && (!tabs[tabId].url.match(/(chrome\:\/\/)|(chrome\-extension\:\/\/)/))) {
                chrome.tabs.executeScript(Number(tabId), {
                    code: code_str
                   // allFrames: true
                });
            }
        });

  });

  chrome.runtime.onMessage.addListener(function(request, sender, callback) {
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
      var toWhitelist = utils.extractHostFromURL(request.whitelist);
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
        callback();
      });
    }

    if (!localStorage['set_atb'] && request.atb) {
      localStorage['atb'] = request.atb;
      localStorage['set_atb'] = request.atb;

      var xhr = new XMLHttpRequest();

      xhr.open('GET',
        'https://duckduckgo.com/exti/?atb=' + request.atb,
        true
      );
      xhr.send();
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
      let ddgAtbRewrite = ATB.redirectURL(e);
      if(ddgAtbRewrite)
          return ddgAtbRewrite;
      
      if(e.type === 'main_frame'){
          delete tabs[e.tabId];
          return;
      }

      if(!tabs[e.tabId]){
          tabs[e.tabId] = {'trackers': {}, "total": 0, 'url': e.url, "dispTotal": 0}
      }

      if(!settings.getSetting('extensionIsEnabled')){
          return;
      }
          
      var block =  trackers.isTracker(e.url, tabs[e.tabId].url, e.tabId);
      
      if(block){
          var name = block.tracker;
          
          if(!tabs[e.tabId]['trackers'][name]){
                tabs[e.tabId]['trackers'][name] = {'count': 1, 'url': block.url, 'type': block.type};
          }
          else{
              tabs[e.tabId]['trackers'][name].count += 1;
          }
          
          tabs[e.tabId]['total'] += 1;
          tabs[e.tabId]['dispTotal'] = Object.keys(tabs[e.tabId].trackers).length;

          updateBadge(e.tabId, tabs[e.tabId].dispTotal);
          chrome.runtime.sendMessage({"rerenderPopup": true});
                
          return {cancel: true};
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

chrome.tabs.onUpdated.addListener(function(id, info, tab) {
    if(tabs[id] && info.status === "loading" && tabs[id].status !== "loading"){
        tabs[id] = {'trackers': {}, "total": 0, "dispTotal": 0, 'url': tab.url, "status": "loading"};
    }
    else if(tabs[id] && info.status === "complete"){
        tabs[id].status = "complete";
        
        if(tab.url){
            tabs[id].url = tab.url;
        }

        Companies.syncToStorage();
    }

});

chrome.tabs.onRemoved.addListener(function(id, info) {
    delete tabs[id];
});

chrome.webRequest.onCompleted.addListener( ATB.updateSetAtb,
    {
        urls: [
            "*://duckduckgo.com/?*",
            "*://*.duckduckgo.com/?*"
        ]
    }
);

