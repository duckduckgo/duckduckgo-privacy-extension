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


function Background()
{
    $this = this;

    // clearing last search on borwser startup
    localStorage['last_search'] = '';

    var VersionManager = {
        majorUpdates: [],
        addMajorUpdate: function (vers) {
            this.majorUpdates = this.majorUpdates.concat(vers);
        },
        isMajorUpdate: function (ver) {
            return (this.majorUpdates.indexOf(ver) != -1);
        }
    };

    var curr_version = chrome.app.getDetails().version;
    var prev_version = localStorage['prev_version'];

    if (prev_version === undefined) {
        chrome.tabs.create({'url': "https://duckduckgo.com/extensions/thanks/"});
    } else if ((prev_version !== curr_version) && VersionManager.isMajorUpdate(curr_version)) {
        chrome.tabs.create({'url': 
            "https://duckduckgo.com/extensions/thanks/?from=" + prev_version + "&to="
                + curr_version});
    }
    localStorage['prev_version'] = curr_version;

    chrome.extension.onMessage.addListener(function(request, sender, callback){
        console.log(request);
        if(request.query)
            return $this.query(request.query, callback);
        if (request.options) {
            callback(localStorage);
        }

        if (request.selection) {
        
        }

        if (request.current_url) {
            chrome.tabs.getSelected(function(tab) {
                console.log(tab);
                var url = tab.url;
                callback(url);
            });
        }

        if (request.uninstall) {
            chrome.management.uninstallSelf({showConfirmDialog: true}); 
        }

        return true;
    });

//  this.menuID = chrome.contextMenus.create({
//       "title" : "Ask the duck",
//       "type" : "normal",
//       "contexts" : ["selection"],
//       "onclick" : function() {
//          console.log('clicked!!!'); 
//       }
//  });
}

Background.prototype.query = function(query, callback) 
{
    var req = new XMLHttpRequest();
    if (localStorage['zeroclickinfo'] === 'true') {
        if(localStorage['meanings'] === 'true')
            req.open('GET', 'https://chrome.duckduckgo.com?q=' + encodeURIComponent(query) + '&format=json', true);
        else
            req.open('GET', 'https://chrome.duckduckgo.com?q=' + encodeURIComponent(query) + '&format=json&d=1', true);
    } else {
        callback(null);
        return;
    }

    req.onreadystatechange = function(data) {
        if (req.readyState != 4)  { return; } 
        var res = JSON.parse(req.responseText);
        callback(res);
    }

    req.send(null);
    return true;
}

var background = new Background();

chrome.omnibox.onInputEntered.addListener( function(text) {
        chrome.tabs.getSelected( undefined, function(tab) {
            chrome.tabs.update(tab.id, {url: tab.url = "https://duckduckgo.com/?q="+encodeURIComponent(text)}, undefined);
        });
});
