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

// Saves options to localStorage.
function save_options() {
  var dev = document.getElementById("dev").checked;
  localStorage["dev"] = dev;
  var lastsearch_enabled = document.getElementById("lastsearch_enabled").checked;
  localStorage["lastsearch_enabled"] = lastsearch_enabled;
  var zeroclick_google_right = document.getElementById("zeroclick_google_right").checked;
  localStorage["zeroclick_google_right"] = zeroclick_google_right;
  var use_post = document.getElementById("use_post").checked;
  localStorage["use_post"] = use_post;
  var safesearch = document.getElementById("safesearch").checked;
  localStorage["safesearch"] = safesearch;

  // setting this to false should also reset the last search.
  if (!lastsearch_enabled)
    localStorage["last_search"] = '';


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
  var dev = localStorage["dev"];
  if (dev === 'true') {
    document.getElementById("dev").checked = true;
  } else {
    document.getElementById("dev").checked = false;
  }

  var lastsearch_enabled = localStorage["lastsearch_enabled"];
  if (lastsearch_enabled === 'true' || lastsearch_enabled == undefined) {
    document.getElementById("lastsearch_enabled").checked = true;
  } else {
    document.getElementById("lastsearch_enabled").checked = false;
  }

  var zeroclick_google_right = localStorage["zeroclick_google_right"];
  if (zeroclick_google_right === 'true') {
    document.getElementById("zeroclick_google_right").checked = true;
  } else {
    document.getElementById("zeroclick_google_right").checked = false;
  }

  var use_post = localStorage["use_post"];
  if (use_post === 'true') {
    document.getElementById("use_post").checked = true;
  } else {
    document.getElementById("use_post").checked = false;
  }

  var safesearch = localStorage["safesearch"];
  if (safesearch === 'true' || safesearch == undefined) {
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
