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
var ddg_zeroclick_timestamp = new Date().getTime();

function init_timer() {
    ddg_zeroclick_timestamp = new Date().getTime();
}


chrome.extension.sendMessage({options: "get"}, function(opt){
    for (var option in opt) {
        options[option] = (opt[option] === 'true') ? true : false;

    }

    init_timer();

    ddgBox = new DuckDuckBox({
                inputName: 'q',
                forbiddenIDs: ['rg_s'],
                hover: true,
                contentDiv: (options['zeroclick_google_right']) ? 'rhs' : 'center_col',
                className: 'google',
                debug: options.dev
              });

    ddgBox.search = function(query) {
            var request = {query: query};
            chrome.extension.sendMessage(request, function(response){
                var time = new Date().getTime();
                var d = time - ddg_zeroclick_timestamp;

                // ditch the InstantAnswer Box if there is a Knowledge Graph
                // result, e.g. superbad
                if (document.querySelector('#rhs_block ol .xpdopen') !== null) {
                    return true;
                }

                // ditch the InstantAnswer Box if there is an artist Knowledge
                // Graph result, e.g. justin bieber
                if (document.querySelector('#rhs_block ol .rhsvw') !== null) {
                    return true;
                }

                if (document.querySelector('#center_col .vk_c') !== null) {
                    return true;
                }

                if (options.dev)
                    console.log("delay", d);

                if (d >= 600)
                    return true;

                ddgBox.renderZeroClick(response, query);
                return true;
            });

        if (options.dev)
            console.log("asked query:", query);
    }

    ddgBox.init();
});

var ddg_timer;

function getQuery(direct) {
    var instant = document.getElementsByClassName("gssb_a");
    if (instant.length !== 0 && !direct){
        var selected_instant = instant[0];

        var query = selected_instant.childNodes[0].childNodes[0].childNodes[0].
                    childNodes[0].childNodes[0].childNodes[0].innerHTML;
        query = query.replace(/<\/?(?!\!)[^>]*>/gi, '');

        if(options.dev)
            console.log("query from hash:", query);

        return query;
    } else {
        return document.getElementsByName('q')[0].value;
    }
}

function qsearch(direct) {
    var query = getQuery(direct);
    ddgBox.lastQuery = query;
    ddgBox.search(query);
    init_timer();
}

// initialize the IA box on every hashchange (helps instant search)
$(window).bind('hashchange', function() {
    init_timer();
    ddgBox.init();
});

// instant search
$('[name="q"]').keyup(function(e){
    var query = getQuery();
    if(ddgBox.lastQuery !== query && query !== '')
        ddgBox.hideZeroClick();

    if(options.dev)
        console.log("pressed key:", e.keyCode);

    var fn = function(){ qsearch(); };

    if(e.keyCode == 40 || e.keyCode == 38)
        fn = function(){ qsearch(true); };

    clearTimeout(ddg_timer);
    ddg_timer = setTimeout(function(){
        fn();
    }, 700);

    // instant search suggestions box onclick
    document.getElementsByClassName("gssb_c")[0].onclick = function(){
        if(options.dev)
            console.log("clicked")

        ddgBox.hideZeroClick();
        qsearch(true);
    };
});

$('[name="btnG"]').click(function(){
    qsearch();
});


