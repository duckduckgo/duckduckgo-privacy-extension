/*
 * Copyright (C) 2012 DuckDuckGo, Inc.
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
  var meanings = document.getElementById("meanings").checked;
  localStorage["meanings"] = meanings;
  var zeroclickinfo = document.getElementById("zeroclickinfo").checked;
  localStorage["zeroclickinfo"] = zeroclickinfo;
  var lastsearch_enabled = document.getElementById("lastsearch_enabled").checked;
  localStorage["lastsearch_enabled"] = lastsearch_enabled;

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

  chrome.extension.sendMessage({'options': localStorage}, function(response){
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

  var meanings = localStorage["meanings"];
  if (meanings === 'true') {
    document.getElementById("meanings").checked = true;
  } else {
    document.getElementById("meanings").checked = false;
  }

  var zeroclickinfo = localStorage["zeroclickinfo"];
  if (zeroclickinfo === 'true' || zeroclickinfo == undefined) {
    document.getElementById("zeroclickinfo").checked = true;
  } else {
    document.getElementById("zeroclickinfo").checked = false;
  }

  var lastsearch_enabled = localStorage["lastsearch_enabled"];
  if (lastsearch_enabled === 'true' || lastsearch_enabled == undefined) {
    document.getElementById("lastsearch_enabled").checked = true;
  } else {
    document.getElementById("lastsearch_enabled").checked = false;
  }

}

document.addEventListener('load', function(){
    restore_options();
})

document.addEventListener('click', function(){
    save_options();
})
