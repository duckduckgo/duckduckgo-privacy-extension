/*
   Copyright (C) 2012, 2016 DuckDuckGo, Inc.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

*/

var bg = chrome.extension.getBackgroundPage();

var asset_paths = {
   icon_maximimize: "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMjAgMjAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDIwIDIwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGcgaWQ9Im1heGltaXplIj48cGF0aCBzdHlsZT0iZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7ZmlsbDojQUFBQUFBOyIgZD0iTTEwLDBjNS41LDAsMTAsNC41LDEwLDEwYzAsNS41LTQuNSwxMC0xMCwxMFMwLDE1LjUsMCwxMEMwLDQuNSw0LjUsMCwxMCwweiIvPjxnPjxnPjxwb2x5Z29uIHN0eWxlPSJmaWxsLXJ1bGU6ZXZlbm9kZDtjbGlwLXJ1bGU6ZXZlbm9kZDtmaWxsOiNGRkZGRkY7IiBwb2ludHM9IjE0LDkgMTEsOSAxMSw2IDksNiA5LDkgNiw5IDYsMTEgOSwxMSA5LDE0IDExLDE0IDExLDExIDE0LDExICIvPjwvZz48L2c+PC9nPjwvc3ZnPg==",
   icon_minimize: "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMjAgMjAiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDIwIDIwOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGcgaWQ9Im1pbmltaXplIj48cGF0aCBzdHlsZT0iZmlsbC1ydWxlOmV2ZW5vZGQ7Y2xpcC1ydWxlOmV2ZW5vZGQ7ZmlsbDojQUFBQUFBOyIgZD0iTTEwLDBjNS41LDAsMTAsNC41LDEwLDEwYzAsNS41LTQuNSwxMC0xMCwxMFMwLDE1LjUsMCwxMEMwLDQuNSw0LjUsMCwxMCwweiIvPjxwYXRoIHN0eWxlPSJmaWxsLXJ1bGU6ZXZlbm9kZDtjbGlwLXJ1bGU6ZXZlbm9kZDtmaWxsOiNGRkZGRkY7IiBkPSJNMTQsOXYySDZWOUgxNHoiLz48L2c+PC9zdmc+",
   btn_normal: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMTYgMTYiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDE2IDE2IiB4bWw6c3BhY2U9InByZXNlcnZlIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iIzYxQTVEQSIgZD0iTTE0LDE2SDJjLTEuMSwwLTItMC45LTItMlYyYzAtMS4xLDAuOS0yLDItMmgxMmMxLjEsMCwyLDAuOSwyLDJ2MTJDMTYsMTUuMSwxNS4xLDE2LDE0LDE2eiIvPjxwb2x5Z29uIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBmaWxsPSIjRkZGRkZGIiBwb2ludHM9IjEyLDcgOSw3IDksNCA3LDQgNyw3IDQsNyA0LDkgNyw5IDcsMTIgOSwxMiA5LDkgMTIsOSAiLz48L3N2Zz4=",
   btn_hover: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgMTYgMTYiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDE2IDE2IiB4bWw6c3BhY2U9InByZXNlcnZlIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZmlsbD0iIzQ0OTVENCIgZD0iTTE0LDE2SDJjLTEuMSwwLTItMC45LTItMlYyYzAtMS4xLDAuOS0yLDItMmgxMmMxLjEsMCwyLDAuOSwyLDJ2MTJDMTYsMTUuMSwxNS4xLDE2LDE0LDE2eiIvPjxwb2x5Z29uIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBmaWxsPSIjRkZGRkZGIiBwb2ludHM9IjEyLDcgOSw3IDksNCA3LDQgNyw3IDQsNyA0LDkgNyw5IDcsMTIgOSwxMiA5LDkgMTIsOSAiLz48L3N2Zz4=",
};

var base_bang = "bang_";
var elements = {
    id: {
        bang: {
            w: base_bang + "w",
            bi: base_bang + "bi",
            a: base_bang + "a",
            gi: base_bang + "gi",
            n: base_bang + "n",
            yt: base_bang + "yt",
            m: base_bang + "m",
        },
        reload_tab: "reload_tab",
        toggle_blocking: "toggle_blocking",
        toggle_social_blocking: "toggle_social_blocking",
        trackers: "trackers",
        tracker_name: "tracker_name",
        req_count: "req_count",
        addons: "addons",
        icon_advanced: "icon_advanced",
        advanced: "advanced",
        adv: {
            ducky: "adv_ducky",
            meanings: "adv_meanings",
        },
        search: {
            form: "search_form_homepage",
            input: "search_form_input_homepage",
            clear: "search_form_input_clear",
            button: "search_button_homepage",
        },
    },
    text: {
        search: "Search DuckDuckGo...",
    },
    css_class: {
        hide: "hide",
        link: "link",
        minimized: "minimized",
        maximized: "maximized",
        selected: "selected",
        tracker: "tracker-link",
    },
};

var css_class = elements.css_class;
var by_id = elements.id;
var search = by_id.search;
var bang = by_id.bang;
var adv = by_id.adv;

var FAKE_POST_FUNCTION =
"   function fake_post() {" +
"       var form = document.createElement('form');" +
"       form.setAttribute('method', 'post');" +
"       form.setAttribute('action', 'https://duckduckgo.com');" +
"       var params = {{{PARAMS}}};" +
"       for(var key in params) {" +
"           var hiddenField = document.createElement('input');" +
"           hiddenField.setAttribute('type', 'hidden');" +
"           hiddenField.setAttribute('name', key);" +
"           hiddenField.setAttribute('value', params[key]);" +
"           form.appendChild(hiddenField);" +
"       }" +
"       document.body.appendChild(form);" +
"       form.submit();" +
"   }";

window.onload = function() {

    document.getElementById(search.input).focus();

    document.getElementById(search.form).onsubmit = search;
    document.getElementById(search.clear).onclick = search_input_clear;

    var prefill_text = 'Search DuckDuckGo...';

    if (localStorage['meanings'] == undefined) {
      localStorage['meanings'] = 'true';
    }

    if (localStorage['advanced_options'] == undefined){
      localStorage['advanced_options'] = 'true';
    }

    if (localStorage['last_search'] != '') {
        document.getElementById(search.input).value = localStorage['last_search'];
        document.getElementById(search.clear).style.display = 'inline-block';
        document.getElementById(search.button).className = css_class.selected;
        document.getElementById(search.input).select();
    }


    document.getElementById(adv.ducky).onclick = ducky_check;
    document.getElementById(adv.meanings).onclick = meanings_check;

    document.getElementById(by_id.addons).onclick = function(){
        chrome.tabs.create({url: "html/options.html"});
    }


    document.getElementById(bang.w).onclick = function(){
      add_bang('!' + bang.w);
    }
    document.getElementById(bang.bi).onclick = function(){
      add_bang('!' + bang.bi);
    }
    document.getElementById(bang.a).onclick = function(){
      add_bang('!' + bang.a);
    }
    document.getElementById(bang.gi).onclick = function(){
      add_bang('!' + bang.gi);
    }
    document.getElementById(bang.n).onclick = function(){
      add_bang('!' + bang.n);
    }
    document.getElementById(bang.yt).onclick = function(){
      add_bang('!' + bang.yt);
    }
    document.getElementById(bang.m).onclick = function(){
      add_bang('!' + bang.m);
    }


    document.getElementById(by_id.reload_tab).onclick = function(){
      reload_tab();
    }
    document.getElementById(by_id.toggle_blocking).onclick = function(){
      toggle_blocking();
    }
    document.getElementById(by_id.toggle_social_blocking).onclick = function(){
      toggle_social_blocking();
    }

    var trackers = document.getElementById(by_id.trackers),
        tracker_name = document.getElementById(by_id.tracker_name),
        req_count = document.getElementById(by_id.req_count);

    (function(){
        getTab(function(t) { 
            var tab = bg.tabs[t.id];
            tracker_name.innerHTML = '';
            req_count.innerHTML = '';

            if (tab && ((!tab.trackers) || (!Object.keys(tab.trackers).length))) {
                trackers.classList.add(css_class.hide);
            }

            if(tab && tab.trackers && Object.keys(tab.trackers).length){
                trackers.classList.remove(css_class.hide);

                Object.keys(tab.trackers).forEach( function(name) {
                    var temp_url = '',
                        trackers_html = '',
                        req_html = '';
                    
                    if(bg.betterList.indexOf(tab.trackers[name].url) !== -1){
                        temp_url = 'https://better.fyi/trackers/' + tab.trackers[name].url;
                    }
                    
                    tracker_name.innerHTML += '<li class="' + css_class.link + '"><a class="' + css_class.tracker + '" href="' + temp_url + '">' + name + '</a></li>'; 
                    
                    req_count.innerHTML += "<li>" + tab.trackers[name].count + "</li>";
                });


                var trackerLinks = document.getElementsByClassName('tracker-link');
                for(var t=0; t < trackerLinks.length; t++){
                    if(trackerLinks[t].href){
                        trackerLinks[t].onclick = function() {
                            chrome.tabs.create({url: this.href});
                        }
                    }
                }

            }
        });
    })();


    var images = document.querySelectorAll('li img');
    for(var i = 0; i < images.length; i++) {
      images[i].onmouseover = function() {
          this.src = asset_paths.btn_hover;
      }

      images[i].onmouseout = function() {
          this.src = asset_paths.btn_normal;
      }
    }

    defaults_check();

    chrome.extension.onMessage.addListener(function(request, sender, sendResponse){
      defaults_check();
    });


    if (localStorage['advanced_options'] !== 'true') {
        var icon_adv = document.getElementById(by_id.icon_advanced);
        icon_adv.src = asset_paths.icon_maximize;
        document.getElementById(by_id.advanced).style.display = 'none';
        icon_adv.className = css_class.minimized;
    }

    function check_uncheck(isChecked, checkboxId) {
        isChecked = !isChecked;

        var switch_button = document.getElementById(checkboxId);

        if (!isChecked) {
            switch_button.checked = false;
        } else {
            switch_button.checked = true;
        }

        document.getElementById(by_id.reload_tab).classList.remove(css_class.hide);
        
        return isChecked;
    }

    function toggle_blocking() {
         bg.isExtensionEnabled = check_uncheck(bg.isExtensionEnabled, elements_by_id.toggle_blocking);
         var social = document.getElementById(by_id.toggle_social_blocking);

         if (!bg.isExtensionEnabled) {
             bg.isSocialBlockingEnabled = false;
             social.parentNode.classList.add(css_class.hide);
             social.checked = false;
             bg.isSocialBlockingEnabled = false;
         } else {
             social.parentNode.classList.remove(css_class.hide);
             social.checked = bg.isSocialBlockingEnabled? true : false;
         }
         
         chrome.runtime.sendMessage({"social": bg.isSocialBlockingEnabled}, function(){});
    }

    function toggle_social_blocking() {
        bg.isSocialBlockingEnabled = check_uncheck(bg.isSocialBlockingEnabled, by_id.toggle_social_blocking);
        chrome.runtime.sendMessage({"social": bg.isSocialBlockingEnabled}, function(){});
    }

    setTimeout(function(){
        var search_input = document.getElementById(search.input);
        
        search_input.focus();
        search_input.onkeydown = function(){
            document.getElementById(search.clear).style.display = 'inline-block';
            document.getElementById(search.button).className = css_class.selected;
            this.style.color = '#000000';
        };
       search_input.onkeyup = function(){
            if (this.value == '') {
                this.style.color = '#999999';
                search_input_clear();
            }
        };
    }, 300);


    function search(){
        var search_input = document.getElementById(search.input);
        var input = search_input.value;

        if (localStorage['lastsearch_enabled'] === 'false')
            localStorage['last_search'] = '';
        else
            localStorage['last_search'] = input;

        if (document.getElementById(adv.ducky).checked === true) {
            input = "\\" + input;
        }

        var special = '';
        if(document.getElementById(adv.meanings).checked !== true) {
            special = '&d=1';
        }

        if (localStorage['safesearch'] === 'false')
            special += '&kp=-1'

        var os = "o";
        if (window.navigator.userAgent.indexOf("Windows") != -1) os = "w";
        if (window.navigator.userAgent.indexOf("Mac") != -1) os = "m";
        if (window.navigator.userAgent.indexOf("Linux") != -1) os = "l";

        special += '&bext=' + os + 'cp';

        if (localStorage['use_post'] === 'true') {
            var fake_post_code = FAKE_POST_FUNCTION.replace(/(\n|\t)/gm,'');

            var params = {
                q: input,
                d:  (special == '') ? 0 : 1
            };

            fake_post_code = fake_post_code.replace('{{{PARAMS}}}', JSON.stringify(params));

            chrome.tabs.create({
                url:  "javascript:" + fake_post_code + "; fake_post();"
            });
        } else {
            chrome.tabs.create({
                url: "https://duckduckgo.com/?q="+encodeURIComponent(input)+special
            });
        }
    }

    document.getElementById(by_id.icon_advanced).onclick = function(){
        var advanced =  document.getElementById(by_id.advanced)
        if (this.className == css_class.minimized) {
            this.src = asset_paths.icon_minimize;
            advanced.style.display = 'block';
            this.className = css_class.maximized;
        } else {
            this.src = asset_paths.icon_maximize;
            advanced.style.display = 'none';
            this.className = css_class.minimized;
        }
        localStorage['advanced_options'] = (advanced.style.display === 'block');
        document.getElementById(search.input).focus();
    }

    function add_bang(bang) {
        var inp = document.getElementById(search.input);

        var bang_regex = /\!\w+/;

        document.getElementById(search.clear).style.display= 'inline-block';
        document.getElementById(search.button).className = css_class.selected;

        if (inp.value === '') {
            inp.style.color = '#000';
            inp.value = bang + ' ';
            inp.focus();
        } else {
            var found_bangs = bang_regex.exec(inp.value);
            if (found_bangs !== null) {
                inp.value = inp.value.replace(found_bangs[0], bang);
                inp.focus();
            } else {
                inp.value += bang;
                search();
            }
        }
    }

    function ducky_check(){
        localStorage['ducky'] = document.getElementById(adv.ducky).checked;
    }

    function meanings_check(){
        localStorage['meanings'] = document.getElementById(adv.meanings).checked;
    }

    function defaults_check(){
        if (localStorage['ducky'] === 'true') {
            document.getElementById(adv.ducky).checked = true;
        }

        if (localStorage['meanings'] === 'true') {
            document.getElementById(adv.meanings).checked = true;
        }

        if (bg.isExtensionEnabled) {
            document.getElementById(by_id.toggle_blocking).checked = true;
            
            var social = document.getElementById(by_id.toggle_social_blocking);
            social.parentNode.classList.remove('hide');
            social.checked = bg.isSocialBlockingEnabled? true : false;
        }
    }

    function search_input_clear() {
        var search_input = document.getElementById(search.input);
        search_input.value = '';
        document.getElementById(search.clear).style.display= 'none';
        search_input.focus();
        document.getElementById(search.button).className = '';
        localStorage['last_search'] = '';
    }

    function reload_tab() {
        chrome.tabs.query({
            'currentWindow': true,
            'active': true
        }, function(tabs) {
            if (tabs[0]) {
                var tabId = tabs[0].id;
                chrome.tabs.reload(tabId);
                document.getElementById(by_id.reload_tab).classList.add(css_class.hide);
                window.close();
            }
        });
    }

    function getTab(callback) {
              chrome.tabs.query({active: true, lastFocusedWindow: true}, function(t) { callback(t[0]); });
    }
}

