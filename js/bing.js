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

var options = {};
var ddgBox;
chrome.extension.sendMessage({options: "get"}, function(opt){
    for (var option in opt) {
        options[option] = (opt[option] === 'true') ? true : false; 
    }

    if (document.getElementById('b_results') !== null) {
        var results_div = 'b_results';
    } else {
        var results_div = 'results_container';
    }

    ddgBox = new DuckDuckBox({ 
                inputName: 'q',
                hover: false,
                contentDiv: results_div,
                className: 'bing'
              });

    ddgBox.search = function(query) {
    var request = {query: query};
            chrome.extension.sendMessage(request, function(response){
                ddgBox.renderZeroClick(response, query);
                return true;
            });

        if (options.dev)
            console.log("query:", query);
    }

    ddgBox.init();

});

ddgBox.search = function(query) {
var request = {query: query};
        chrome.extension.sendMessage(request, function(response){
            ddgBox.renderZeroClick(response, query);
        });

    if (options.dev)
        console.log("query:", query);
}

var ddg_timer;

function getQuery(direct) {
    var instant = document.getElementsByClassName("gssb_a");
    if (instant.length !== 0 && !direct){
        var selected_instant = instant[0];
        
        var query = selected_instant.childNodes[0].childNodes[0].childNodes[0].
                    childNodes[0].childNodes[0].childNodes[0].innerHTML;
        query = query.replace(/<\/?(?!\!)[^>]*>/gi, '');

        if(options.dev)
            console.log(query);

        return query;
    } else {
        return document.getElementsByName('q')[0].value;
    }
}

function qsearch(direct) {
    var query = getQuery(direct);
    ddgBox.lastQuery = query;
    ddgBox.search(query);
} 

// instant search

$('[name="q"]').keyup(function(e){
    var query = getQuery();
    if(ddgBox.lastQuery !== query && query !== '')
        ddgBox.hideZeroClick();

    if(options.dev)
        console.log(e.keyCode);

    var direct = false;
    if(e.keyCode == 40 || e.keyCode == 38)
        direct = true;

    clearTimeout(ddg_timer);
    ddg_timer = setTimeout(function(){
        qsearch(direct);
    }, 700);
   
});

$('[name="go"]').click(function(){
    qsearch();
});

ddgBox.init();

