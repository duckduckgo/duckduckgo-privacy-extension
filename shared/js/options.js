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

var bg = chrome.extension.getBackgroundPage();
var settings = bg.settings;
var load = bg.load;

var elements
load.JSONfromLocalFile("data/popup_data.json", (data) => elements = data)

var asset_paths = elements.asset_paths;

elements = elements.elements;

var os = elements.os;
var param = elements.param;
var css_class = elements.css_class;
var by_id = elements.id;
var search_data = by_id.search;
var bang = by_id.bang;
var adv = by_id.adv;
var url = elements.url;

// Saves options to settings.
function save_options() {
  var dev = document.getElementById("dev").checked;
  settings.updateSetting("dev", dev);
  var lastsearch_enabled = document.getElementById("lastsearch_enabled").checked;
  settings.updateSetting("lastsearch_enabled", lastsearch_enabled);
  var zeroclick_google_right = document.getElementById("zeroclick_google_right").checked;
  settings.updateSetting("zeroclick_google_right", zeroclick_google_right);
  var use_post = document.getElementById("use_post").checked;
  settings.updateSetting("use_post", use_post);
  var safesearch = document.getElementById("safesearch").checked;
  settings.updateSetting("safesearch", safesearch);

  // setting this to false should also reset the last search.
  if (!lastsearch_enabled)
    settings.updateSetting('last_search', '');


  if (dev)
    console.log(localStorage);

  // Update status to let user know options were saved.
  var status = document.getElementById("status");
  status.innerHTML = "Options Saved.";
  setTimeout(function() {
    status.innerHTML = "";
  }, 750);

  chrome.extension.sendMessage({
    'options': localStorage
  }, function(response) {
    console.log(response);
  });
}

// Restores select box state to saved value from localStorage.
function restore_options() {
  var dev = settings.getSetting("dev");
  if (dev === 'true') {
    document.getElementById("dev").checked = true;
  } else {
    document.getElementById("dev").checked = false;
  }

  var lastsearch_enabled = settings.getSetting("lastsearch_enabled");
  if (lastsearch_enabled === 'true' || lastsearch_enabled == undefined) {
    document.getElementById("lastsearch_enabled").checked = true;
  } else {
    document.getElementById("lastsearch_enabled").checked = false;
  }

  var zeroclick_google_right = settings.getSetting("zeroclick_google_right");
  if (zeroclick_google_right) {
    document.getElementById("zeroclick_google_right").checked = true;
  } else {
    document.getElementById("zeroclick_google_right").checked = false;
  }

  var use_post = settings.getSetting("use_post");
  if (use_post) {
    document.getElementById("use_post").checked = true;
  } else {
    document.getElementById("use_post").checked = false;
  }

  var safesearch = settings.getSetting("safesearch");
  if (safesearch) {
    document.getElementById("safesearch").checked = true;
  } else {
    document.getElementById("safesearch").checked = false;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  restore_options();
})

document.addEventListener('click', function() {
  save_options();
})
