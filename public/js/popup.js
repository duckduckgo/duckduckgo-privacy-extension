this["Handlebars"] = this["Handlebars"] || {};
this["Handlebars"]["templates"] = this["Handlebars"]["templates"] || {};

this["Handlebars"]["templates"]["req_count"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<li>";
  if (helper = helpers.tab_trackers_count) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.tab_trackers_count); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "</li>\n";
  return buffer;
  });

this["Handlebars"]["templates"]["tracker"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, helper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<li class=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.css_class)),stack1 == null || stack1 === false ? stack1 : stack1.link)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n    <a class=\""
    + escapeExpression(((stack1 = ((stack1 = (depth0 && depth0.css_class)),stack1 == null || stack1 === false ? stack1 : stack1.tracker)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" href=\"";
  if (helper = helpers.temp_url) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.temp_url); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\">\n        ";
  if (helper = helpers.name) { stack1 = helper.call(depth0, {hash:{},data:data}); }
  else { helper = (depth0 && depth0.name); stack1 = typeof helper === functionType ? helper.call(depth0, {hash:{},data:data}) : helper; }
  buffer += escapeExpression(stack1)
    + "\n    </a>\n</li>\n";
  return buffer;
  });
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
var settings = bg.settings;
var load = bg.load;

var elements = load.JSONfromLocalFile("data/popup_data.json");
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

    document.getElementById(search_data.input).focus();

    document.getElementById(search_data.form).onsubmit = search;
    document.getElementById(search_data.clear).onclick = search_input_clear;

    var prefill_text = elements.text.search;

    if (settings.getSetting('last_search') !== '') {
        document.getElementById(search_data.input).value = settings.getSetting('last_search');
        document.getElementById(search_data.clear).style.display = 'inline-block';
        document.getElementById(search_data.button).className = css_class.selected;
        document.getElementById(search_data.input).select();
    }


    document.getElementById(adv.ducky).onclick = ducky_check;
    document.getElementById(adv.meanings).onclick = meanings_check;

    document.getElementById(by_id.addons).onclick = function(){
        chrome.tabs.create({url: url.html});
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
                        temp_url = url.better_fyi + tab.trackers[name].url;
                    }
                    
                    tracker_name.innerHTML += Handlebars.templates.tracker({css_class: css_class, temp_url: temp_url, name: name});
                    
                    req_count.innerHTML += Handlebars.templates.req_count({tab_trackers_count: tab.trackers[name].count});
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


    if (!settings.getSetting('advanced_options')) {
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
         settings.updateSetting("extensionIsEnabled", check_uncheck(settings.getSetting("extensionIsEnabled"), by_id.toggle_blocking));
         var social = document.getElementById(by_id.toggle_social_blocking);

         if (!settings.getSetting("extensionIsEnabled")) {
             settings.updateSetting("socialBlockingIsEnabled", false);
             social.parentNode.classList.add(css_class.hide);
             social.checked = false;
         } else {
             social.parentNode.classList.remove(css_class.hide);
             social.checked = settings.getSetting("socialBlockingIsEnabled")? true : false;
         }
         
         chrome.runtime.sendMessage({"social": settings.getSetting("socialBlockingIsEnabled")}, function(){});
    }

    function toggle_social_blocking() {
        social_blocking = settings.getSetting("socialBlockingIsEnabled");
        settings.updateSetting("socialBlockingIsEnabled", check_uncheck(social_blocking, by_id.toggle_social_blocking));
        chrome.runtime.sendMessage({"social": settings.getSetting("socialBlockingIsEnabled")}, function(){});
    }

    setTimeout(function(){
        var search_input = document.getElementById(search_data.input);
        
        search_input.focus();
        search_input.onkeydown = function(){
            document.getElementById(search_data.clear).style.display = 'inline-block';
            document.getElementById(search_data.button).className = css_class.selected;
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
        var search_input = document.getElementById(search_data.input);
        var input = search_input.value;

        if (!settings.getSetting('lastsearch_enabled')) {
            settings.updateSetting('last_search', '');
        } else {
            settings.updateSetting('last_search', input);
        }

        if (document.getElementById(adv.ducky).checked === true) {
            input = "\\" + input;
        }

        var special = '';
        if(document.getElementById(adv.meanings).checked !== true) {
            special = param.meanings;
        }

        if (!settings.getSetting('safesearch')) {
            special += param.safesearch;
        }

        var os = "o";
        if (window.navigator.userAgent.indexOf(os.win) != -1) os = "w";
        if (window.navigator.userAgent.indexOf(os.mac) != -1) os = "m";
        if (window.navigator.userAgent.indexOf(os.lin) != -1) os = "l";

        special += param.os + os + 'cp';

        if (settings.getSetting('use_post')) {
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
                url: url.ddg + encodeURIComponent(input) + special
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
        settings.updateSetting('advanced_options', (advanced.style.display === 'block'));
        document.getElementById(search_data.input).focus();
    }

    function add_bang(bang) {
        var inp = document.getElementById(search_data.input);

        var bang_regex = /\!\w+/;

        document.getElementById(search_data.clear).style.display= 'inline-block';
        document.getElementById(search_data.button).className = css_class.selected;

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
        settings.updateSetting('ducky', document.getElementById(adv.ducky).checked);
    }

    function meanings_check(){
        settings.updateSetting('meanings', document.getElementById(adv.meanings).checked);
    }

    function defaults_check(){
        if (settings.getSetting('ducky')) {
            document.getElementById(adv.ducky).checked = true;
        }

        if (settings.getSetting('meanings')) {
            document.getElementById(adv.meanings).checked = true;
        }

        if (settings.getSetting('extensionIsEnabled')) {
            document.getElementById(by_id.toggle_blocking).checked = true;
            
            var social = document.getElementById(by_id.toggle_social_blocking);
            social.parentNode.classList.remove(css_class.hide);
            social.checked = settings.getSetting('socialBlockingIsEnabled')? true : false;
        }
    }

    function search_input_clear() {
        var search_input = document.getElementById(search_data.input);
        search_input.value = '';
        document.getElementById(search_data.clear).style.display= 'none';
        search_input.focus();
        document.getElementById(search_data.button).className = '';
        settings.updateSetting('last_search', '');
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

